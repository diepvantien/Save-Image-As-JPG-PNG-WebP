let action = 'none'; // 'draw', 'move', 'resize-nw', 'resize-ne', 'resize-sw', 'resize-se'
let dragStartX = 0, dragStartY = 0;
let initialRect = { x: 0, y: 0, w: 0, h: 0 };
let rect = { x: 0, y: 0, w: 0, h: 0 };

const box = document.getElementById('crop-box');
const img = document.getElementById('image');
const workspace = document.getElementById('workspace');

chrome.storage.local.get(['crop_image'], (data) => {
  if (data.crop_image) {
    img.src = data.crop_image;
  }
});

workspace.addEventListener('mousedown', (e) => {
  const r = workspace.getBoundingClientRect();
  dragStartX = e.clientX - r.left;
  dragStartY = e.clientY - r.top;
  
  const cl = e.target.classList;
  if (cl.contains('handle')) {
    if (cl.contains('nw')) action = 'resize-nw';
    else if (cl.contains('ne')) action = 'resize-ne';
    else if (cl.contains('sw')) action = 'resize-sw';
    else if (cl.contains('se')) action = 'resize-se';
    initialRect = { ...rect };
  } else if (e.target.id === 'crop-box') {
    action = 'move';
    initialRect = { ...rect };
  } else {
    action = 'draw';
    initialRect = { x: dragStartX, y: dragStartY, w: 0, h: 0 };
    box.style.display = 'block';
    updateBox(dragStartX, dragStartY, 0, 0);
  }
});

workspace.addEventListener('mousemove', (e) => {
  if (action === 'none') return;
  const r = workspace.getBoundingClientRect();
  let curX = e.clientX - r.left;
  let curY = e.clientY - r.top;
  
  if (action === 'draw') {
    let w = Math.abs(curX - dragStartX);
    let h = Math.abs(curY - dragStartY);
    
    const ratio = document.getElementById('sel-ratio').value;
    if (ratio !== 'free') {
      const [rw, rh] = ratio.split(':').map(Number);
      const targetRatio = rw / rh;
      if (w / targetRatio > h) w = h * targetRatio;
      else h = w / targetRatio;
    }
    
    let x = dragStartX + (curX > dragStartX ? 0 : -w);
    let y = dragStartY + (curY > dragStartY ? 0 : -h);
    updateBox(x, y, w, h);
  } else if (action === 'move') {
    let dx = curX - dragStartX;
    let dy = curY - dragStartY;
    updateBox(initialRect.x + dx, initialRect.y + dy, initialRect.w, initialRect.h);
  } else if (action.startsWith('resize')) {
    let oppX, oppY;
    if (action === 'resize-nw') { oppX = initialRect.x + initialRect.w; oppY = initialRect.y + initialRect.h; }
    else if (action === 'resize-ne') { oppX = initialRect.x; oppY = initialRect.y + initialRect.h; }
    else if (action === 'resize-sw') { oppX = initialRect.x + initialRect.w; oppY = initialRect.y; }
    else if (action === 'resize-se') { oppX = initialRect.x; oppY = initialRect.y; }
    
    let w = Math.abs(curX - oppX);
    let h = Math.abs(curY - oppY);
    
    const ratio = document.getElementById('sel-ratio').value;
    if (ratio !== 'free') {
      const [rw, rh] = ratio.split(':').map(Number);
      const targetRatio = rw / rh;
      if (w / targetRatio > h) w = h * targetRatio;
      else h = w / targetRatio;
    }
    
    let x = action.includes('w') ? oppX - w : oppX;
    let y = action.includes('n') ? oppY - h : oppY;
    updateBox(x, y, w, h);
  }
});

window.addEventListener('mouseup', () => {
  action = 'none';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    action = 'none';
    box.style.display = 'none';
    rect = { x: 0, y: 0, w: 0, h: 0 };
  }
});

function updateBox(x, y, w, h) {
  // clamp to workspace boundaries
  const wsRect = workspace.getBoundingClientRect();
  x = Math.max(0, Math.min(x, wsRect.width));
  y = Math.max(0, Math.min(y, wsRect.height));
  w = Math.max(0, Math.min(w, wsRect.width - x));
  h = Math.max(0, Math.min(h, wsRect.height - y));

  rect = { x, y, w, h };
  box.style.left = x + 'px';
  box.style.top = y + 'px';
  box.style.width = w + 'px';
  box.style.height = h + 'px';
}

document.getElementById('btn-reset').addEventListener('click', () => {
  box.style.display = 'none';
  rect = { w: 0, h: 0 };
});

document.getElementById('btn-save').addEventListener('click', () => {
  if (rect.w === 0 || rect.h === 0) return alert('Please click and drag over the image to draw a crop selection area!');
  
  const imgRect = img.getBoundingClientRect();
  const wsRect = workspace.getBoundingClientRect();

  // Convert workspace coordinates to image rendered coordinates
  const imgLeft = imgRect.left - wsRect.left;
  const imgTop = imgRect.top - wsRect.top;

  // Intersection between crop box and image
  const cropX = Math.max(0, rect.x - imgLeft);
  const cropY = Math.max(0, rect.y - imgTop);
  const cropW = Math.min(imgRect.width - cropX, rect.x + rect.w - imgLeft - cropX);
  const cropH = Math.min(imgRect.height - cropY, rect.y + rect.h - imgTop - cropY);

  if (cropW <= 0 || cropH <= 0) return alert('Selection must be inside the image area.');

  // Scale to natural size
  const scaleX = img.naturalWidth / imgRect.width;
  const scaleY = img.naturalHeight / imgRect.height;

  const finalX = Math.round(cropX * scaleX);
  const finalY = Math.round(cropY * scaleY);
  const finalW = Math.round(cropW * scaleX);
  const finalH = Math.round(cropH * scaleY);

  if (finalW <= 0 || finalH <= 0) return alert('Invalid crop dimensions.');

  const canvas = document.createElement('canvas');
  canvas.width = finalW;
  canvas.height = finalH;
  const ctx = canvas.getContext('2d');

  const format = document.getElementById('sel-format').value;
  if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, finalW, finalH);
  }

  ctx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);
  
  chrome.storage.local.get(['crop_filename'], (data) => {
    const baseExt = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[format];
    const c = (data.crop_filename || 'image').replace(/[^a-zA-Z0-9_\u00C0-\u9FFF]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const filename = `${c}_cropped_${Date.now()}.${baseExt}`;
    
    // Get quality user settings from sync
    chrome.storage.sync.get(null, (settings) => {
      let q = 0.92;
      if (format === 'image/jpeg') q = settings.quality_jpg || 0.92;
      if (format === 'image/webp') q = settings.quality_webp || 0.92;
      
      chrome.downloads.download({
        url: canvas.toDataURL(format, q),
        filename: filename
      }, () => {
        window.close(); // Close the tab after saving
      });
    });
  });
});