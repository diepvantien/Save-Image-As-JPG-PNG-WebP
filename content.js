// ============================================================
//  Save Image As JPG/PNG/WebP  –  content.js
//  Tracks right-clicked images & handles social-platform URLs
// ============================================================

(function () {
  'use strict';

  let lastTarget = null;

  // ── Track right-click target ─────────────────────────────
  document.addEventListener('contextmenu', (e) => {
    lastTarget = e.target;
  }, true);

  // ── Message Handler ──────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getImageInfo') {
      const info = extractImageInfo(lastTarget, msg.srcUrl);
      sendResponse(info);
      return false; // sync
    }

    if (msg.action === 'convertImage') {
      convertImageInPage(msg.url, msg.mime, msg.quality, msg.scale)
        .then((dataUrl) => sendResponse({ dataUrl }))
        .catch((err) => sendResponse({ error: err.message }));
      return true; // async
    }
  });

  // ── Image Info Extraction ────────────────────────────────
  function extractImageInfo(target, fallbackUrl) {
    if (!target) return { url: fallbackUrl };

    // Walk up DOM to find best image container
    let el = target;

    // 1) Canvas element
    if (el.tagName === 'CANVAS') {
      try {
        return {
          url: el.toDataURL('image/png'),
          suggestedName: 'canvas_image',
          width: el.width,
          height: el.height,
        };
      } catch (_) {}
    }

    // 2) Video – capture current frame
    if (el.tagName === 'VIDEO') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = el.videoWidth || 640;
        canvas.height = el.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(el, 0, 0);
        return {
          url: canvas.toDataURL('image/png'),
          suggestedName: el.title || 'video_frame',
        };
      } catch (_) {}
    }

    // 3) IMG element (or ancestor)
    let imgEl = el.tagName === 'IMG' ? el : el.closest('img');
    if (!imgEl) imgEl = el.querySelector('img');

    if (imgEl) {
      const url = getBestImageUrl(imgEl);
      const name = suggestName(imgEl);
      return {
        url: transformUrl(url, window.location.hostname),
        suggestedName: name,
        width: imgEl.naturalWidth,
        height: imgEl.naturalHeight,
      };
    }

    // 4) Background image
    const bgUrl = getBackgroundUrl(el);
    if (bgUrl) {
      return { url: transformUrl(bgUrl, window.location.hostname) };
    }

    // 5) picture > source
    const picture = el.closest('picture');
    if (picture) {
      const sources = picture.querySelectorAll('source');
      for (const src of sources) {
        const srcset = src.srcset || src.getAttribute('srcset');
        if (srcset) {
          const best = parseSrcset(srcset);
          if (best) return { url: transformUrl(best, window.location.hostname) };
        }
      }
    }

    return { url: fallbackUrl };
  }

  // ── Best URL from <img> ───────────────────────────────────
  function getBestImageUrl(img) {
    const hostname = window.location.hostname;

    // Twitter/X: get highest quality from srcset
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      const url = img.src || img.currentSrc || '';
      return tweakTwitterUrl(url);
    }

    // Instagram: prefer highest-res srcset entry
    if (hostname.includes('instagram.com')) {
      const srcset = img.srcset || img.getAttribute('srcset') || '';
      if (srcset) {
        const best = parseSrcset(srcset);
        if (best) return best;
      }
    }

    // General: prefer srcset → currentSrc → src
    const srcset = img.srcset || img.getAttribute('srcset') || '';
    if (srcset) {
      const best = parseSrcset(srcset);
      if (best) return best;
    }

    return img.currentSrc || img.src || img.getAttribute('src') || '';
  }

  // ── Srcset Parser (returns highest-res URL) ───────────────
  function parseSrcset(srcset) {
    if (!srcset) return null;
    const entries = srcset.split(',').map((s) => s.trim()).filter(Boolean);
    let bestUrl = null;
    let bestValue = -1;

    for (const entry of entries) {
      const parts = entry.split(/\s+/);
      if (!parts[0]) continue;
      const url = parts[0];
      let value = 1;
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].endsWith('w')) value = parseInt(parts[i]) || 1;
        else if (parts[i].endsWith('x')) value = parseFloat(parts[i]) * 1000 || 1;
      }
      if (value > bestValue) {
        bestValue = value;
        bestUrl = url;
      }
    }
    return bestUrl;
  }

  // ── Background image URL ─────────────────────────────────
  function getBackgroundUrl(el) {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const style = window.getComputedStyle(node);
      const bg = style.backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && match[1] && !match[1].startsWith('data:')) {
          return match[1];
        }
      }
    }
    return null;
  }

  // ── Platform URL Transformations ─────────────────────────
  function transformUrl(url, hostname) {
    if (!url) return url;

    // Twitter / X – always get 'orig' quality
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return tweakTwitterUrl(url);
    }

    // Facebook – strip size constraints from CDN URLs
    if (hostname.includes('facebook.com') || hostname.includes('fbcdn.net')) {
      return tweakFacebookUrl(url);
    }

    // Instagram – strip size path segments
    if (hostname.includes('instagram.com')) {
      return tweakInstagramUrl(url);
    }

    // TikTok – prefer webp_720 → webp → jpg
    if (hostname.includes('tiktok.com')) {
      return url; // TikTok URLs work as-is
    }

    // Pinterest – get original quality
    if (hostname.includes('pinterest.com')) {
      return tweakPinterestUrl(url);
    }

    // Reddit
    if (hostname.includes('reddit.com') || hostname.includes('redd.it')) {
      return tweakRedditUrl(url);
    }

    return url;
  }

  function tweakTwitterUrl(url) {
    if (!url.includes('pbs.twimg.com') && !url.includes('twimg.com')) return url;
    // Remove existing format/name params
    let clean = url.split('?')[0];
    const sep = url.includes('?') ? '&' : '?';
    // Re-add for original PNG quality
    clean = url.replace(/([?&])format=[^&]*/g, '$1format=png');
    clean = clean.replace(/([?&])name=[^&]*/g, '$1name=orig');
    if (!clean.includes('format=')) clean += (clean.includes('?') ? '&' : '?') + 'format=png&name=orig';
    if (!clean.includes('name=')) clean += '&name=orig';
    return clean;
  }

  function tweakFacebookUrl(url) {
    // Remove _nc_cat, _nc_sid etc. to get clean URL, but keep auth tokens
    return url.replace(/&_nc_cat=\d+/g, '');
  }

  function tweakInstagramUrl(url) {
    // Remove size constraints like /s640x640/ or /e35/
    return url.replace(/\/[se]\d+x\d+\//g, '/').replace(/\/[se]\d+\//g, '/');
  }

  function tweakPinterestUrl(url) {
    // Replace /236x/ /474x/ /564x/ with /originals/ for full quality
    return url
      .replace(/\/\d+x\//, '/originals/')
      .replace(/\/\d+x\d+\//, '/originals/');
  }

  function tweakRedditUrl(url) {
    // preview.redd.it → i.redd.it for original
    return url.replace('preview.redd.it', 'i.redd.it').split('?')[0];
  }

  // ── Suggest filename from image element ──────────────────
  function suggestName(img) {
    // alt text
    if (img.alt && img.alt.trim()) {
      return img.alt.trim().substring(0, 50).replace(/\s+/g, '_');
    }
    // data-filename attribute (some platforms)
    if (img.dataset && img.dataset.filename) return img.dataset.filename;
    // from URL
    const src = img.src || img.currentSrc || '';
    const match = src.split('/').pop().split('?')[0].split('#')[0];
    if (match && match.length > 3) return match.replace(/\.[^.]+$/, '');
    return 'image';
  }

  // ── In-page Canvas Conversion (CORS fallback) ────────────
  function convertImageInPage(url, mime, quality, scale) {
    scale = scale || 1.0;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width || 800) * scale));
          canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height || 600) * scale));
          const ctx = canvas.getContext('2d');

          if (mime === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL(mime, quality);

          if (!dataUrl || dataUrl === 'data:,') {
            reject(new Error('Canvas export failed (empty result)'));
          } else {
            resolve(dataUrl);
          }
        } catch (e) {
          reject(e);
        }
      };

      img.onerror = () => {
        // Try without crossOrigin (loses CORS but may succeed for display)
        const img2 = new Image();
        img2.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round((img2.naturalWidth || 800) * scale));
            canvas.height = Math.max(1, Math.round((img2.naturalHeight || 600) * scale));
            const ctx = canvas.getContext('2d');
            if (mime === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img2, 0, 0, canvas.width, canvas.height);
            // This will throw SecurityError if tainted, but worth trying
            const dataUrl = canvas.toDataURL(mime, quality);
            resolve(dataUrl);
          } catch (e) {
            reject(new Error('CORS blocked – cannot convert this image'));
          }
        };
        img2.onerror = () => reject(new Error('Image load failed'));
        img2.src = url;
      };

      img.src = url;
    });
  }

})();
