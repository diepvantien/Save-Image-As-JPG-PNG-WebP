const FORMATS = [
  { id: 'png',  label: 'Save as PNG',  mime: 'image/png',  ext: 'png',  quality: 1.0  },
  { id: 'jpg',  label: 'Save as JPG',  mime: 'image/jpeg', ext: 'jpg',  quality: 0.92 },
  { id: 'webp', label: 'Save as WebP', mime: 'image/webp', ext: 'webp', quality: 0.92 }
];

async function createContextMenus() {
  const settings = await getSettings();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'parent', title: 'Save Image As...', contexts: ['image'] });
    FORMATS.forEach((fmt) => {
      chrome.contextMenus.create({ id: fmt.id, parentId: 'parent', title: fmt.label, contexts: ['image'] });
    });
    chrome.contextMenus.create({ type: 'separator', id: 'sep1', parentId: 'parent', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'crop', parentId: 'parent', title: '✂️ Crop & Save Image...', contexts: ['image'] });
  });
}

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'sync') createContextMenus(); });

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'crop') {
    try {
      let imageData = null;
      try { imageData = await chrome.tabs.sendMessage(tab.id, { action: 'getImageInfo', srcUrl: info.srcUrl }); } catch (_) {}
      const rawUrl = (imageData && imageData.url) ? imageData.url : info.srcUrl;
      const isDataUrl = rawUrl && rawUrl.startsWith('data:');
      const isBlobUrl = rawUrl && rawUrl.startsWith('blob:');

      let dataUrl = null;
      if (!isBlobUrl) {
         try { dataUrl = await convertViaOffscreenCanvas(rawUrl, 'image/png', 1.0, isDataUrl, 1.0); } catch(e){}
      }
      if (!dataUrl) {
        try {
          const result = await chrome.tabs.sendMessage(tab.id, { action: 'convertImage', url: rawUrl, mime: 'image/png', quality: 1, scale: 1 });
          if (result && result.dataUrl) dataUrl = result.dataUrl;
        } catch(e){}
      }
      if (!dataUrl) return notifyError(tab.id, `Cannot load image for cropping.`);
      
      await chrome.storage.local.set({ crop_image: dataUrl, crop_filename: (imageData?.suggestedName || 'image') });
      chrome.tabs.create({ url: chrome.runtime.getURL('crop.html') });
    } catch(err) { notifyError(tab.id, 'Error loading crop tool: ' + err.message); }
    return;
  }

  const fmt = FORMATS.find((f) => f.id === info.menuItemId);
  if (!fmt) return;

  try {
    let imageData = null;
    try { imageData = await chrome.tabs.sendMessage(tab.id, { action: 'getImageInfo', srcUrl: info.srcUrl }); } catch (_) {}
    const rawUrl = (imageData && imageData.url) ? imageData.url : info.srcUrl;
    const isDataUrl = rawUrl && rawUrl.startsWith('data:');
    const isBlobUrl = rawUrl && rawUrl.startsWith('blob:');

    const settings = await getSettings();
    const quality = settings[`quality_${fmt.id}`] ?? fmt.quality;
    const scale = settings.image_scale || 1.0;
    
    let dataUrl = null;

    if (!isBlobUrl) {
      try { dataUrl = await convertViaOffscreenCanvas(rawUrl, fmt.mime, quality, isDataUrl, scale); } catch (e) {
          if(e.message === 'unsupported_format') return notifyError(tab.id, `Browser does not support saving this format.`);
      }
    }

    if (!dataUrl) {
      try {
        const result = await chrome.tabs.sendMessage(tab.id, { action: 'convertImage', url: rawUrl, mime: fmt.mime, quality, scale });
        if (result && result.dataUrl) dataUrl = result.dataUrl;
      } catch (e) {}
    }

    if (!dataUrl) return notifyError(tab.id, `Cannot convert this image.`);

    await downloadFile(dataUrl, buildFilename(imageData?.suggestedName || 'image', fmt.ext));
  } catch (err) {
    notifyError(tab.id, 'Error saving image: ' + err.message);
  }
});

async function convertViaOffscreenCanvas(url, mime, quality, isDataUrl, scale) {
  let blob;
  if (isDataUrl) blob = dataUrlToBlob(url);
  else {
    const resp = await fetch(url, { credentials: 'include', headers: { 'Referer': url } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    blob = await resp.blob();
  }
  if (mime === 'image/gif' || mime === 'image/bmp') {
    if (mime === 'image/gif') return blobToDataUrl(blob);
  }

  const bitmap = await createImageBitmap(blob);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  
  const ctx = canvas.getContext('2d');
  if (mime === 'image/jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const outBlob = await canvas.convertToBlob({ type: mime, quality });
  if (outBlob.type !== mime && mime !== 'image/png' && mime !== 'image/jpeg') {
    throw new Error('unsupported_format');
  }
  return blobToDataUrl(outBlob);
}

function blobToDataUrl(blob) {
  return new Promise((r, j) => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.onerror = j; rd.readAsDataURL(blob); });
}

function dataUrlToBlob(dataUrl) {
  const [h, b] = dataUrl.split(',');
  const bin = atob(b); const a = new Uint8Array(bin.length);
  for (let i=0; i<bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: h.match(/:(.*?);/)[1] });
}

function buildFilename(base, ext) {
  const c = base.replace(/[^a-zA-Z0-9_\u00C0-\u9FFF]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 80) || 'image';
  return `${c}_${Date.now()}.${ext}`;
}

async function downloadFile(url, filename) {
  const settings = await getSettings();
  return new Promise((r, j) => {
    chrome.downloads.download({ url, filename, saveAs: !!settings.saveAs, conflictAction: 'uniquify' }, (id) => {
      if (chrome.runtime.lastError) j(new Error(chrome.runtime.lastError.message));
      else r(id);
    });
  });
}

function getSettings() { return new Promise((r) => chrome.storage.sync.get(null, r)); }

function notifyError(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => {
      const d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(28,28,30,.9);color:#fff;padding:12px 24px;border-radius:30px;font:14px/1.4 -apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);backdrop-filter:blur(10px);text-align:center;font-weight:500';
      document.body.appendChild(d);
      setTimeout(() => { d.style.opacity='0'; d.style.transition='opacity .3s'; setTimeout(()=>d.remove(), 300); }, 3000);
    },
    args: [message],
  }).catch(() => {});
}
