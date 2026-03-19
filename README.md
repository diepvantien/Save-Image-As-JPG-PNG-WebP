# 🖼 Save Image As JPG/PNG/WebP

**Version:** 1.2.0  
**Manifest Version:** MV3 (Chrome / Edge / Brave)

---

## ✨ Features

- **Right-click any image** → Save as JPG, PNG, WebP, GIF, BMP or Original
- **Quality control** – Adjust JPG & WebP quality from the popup
- **Social platforms** – Smart URL extraction for:
  - Twitter / X (gets original quality)
  - Facebook / Instagram (strips size constraints)
  - Pinterest (gets full-resolution original)
  - Reddit (bypasses preview CDN)
  - TikTok, YouTube, and more
- **Canvas capture** – Save images from `<canvas>` elements and video frames
- **Background images** – Right-click on elements with CSS background images
- **Fallback chain** – OffscreenCanvas → content-script canvas → original download

---

## 📦 Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `save-image-ext` folder
5. The extension icon appears in the toolbar ✓

---

## 🚀 How to Use

### Right-click menu
Right-click any image on any webpage:

```
🖼 Save Image As...
  ├── Save as JPG       ← Quick picks
  ├── Save as PNG
  ├── Save as WebP
  ├── ──────────────
  ├── Save as GIF
  ├── Save as BMP
  ├── ──────────────
  └── ⬇ Save Original  ← No conversion
```

Plus 3 quick top-level shortcuts:
```
  Save as JPG   (quick)
  Save as PNG   (quick)
  Save as WebP  (quick)
```

### Popup settings
Click the toolbar icon to:
- Adjust JPG quality (10–100%)
- Adjust WebP quality (10–100%)
- Toggle "Save As" dialog

---

## 🌐 Platform Support

| Platform   | URL Transform | Notes |
|------------|--------------|-------|
| Twitter/X  | ✅ `?format=png&name=orig` | Gets highest resolution |
| Facebook   | ✅ CDN cleanup | Original quality |
| Instagram  | ✅ Remove size params | Full resolution |
| Pinterest  | ✅ `/originals/` path | Full resolution |
| Reddit     | ✅ `preview.redd.it → i.redd.it` | |
| TikTok     | ✅ Direct CDN | Works as-is |
| YouTube    | ✅ Canvas capture | For thumbnails |
| All others | ✅ Standard fetch | |

---

## 🔑 Permissions

| Permission | Why |
|-----------|-----|
| `contextMenus` | Right-click menu |
| `downloads` | Save files |
| `activeTab` | Read current tab |
| `scripting` | Inject content script |
| `storage` | Save quality settings |
| `offscreen` | Image conversion |
| `<all_urls>` | Fetch images from any domain |

---

## 🛠 Technical Details

**Conversion Pipeline:**
1. Content script extracts best image URL (handles srcset, social platforms)
2. Background service worker fetches image using `host_permissions`
3. `OffscreenCanvas` converts to target format
4. Falls back to content-script canvas if CORS blocks SW fetch
5. Last resort: downloads original file

**File Structure:**
```
save-image-ext/
├── manifest.json     MV3 manifest
├── background.js     Service worker (conversion + download)
├── content.js        DOM image extraction + platform URLs
├── popup.html        Settings UI
├── popup.js          Settings logic
├── README.md         This file
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 📝 Notes

- **GIF animation**: Converting GIF to other formats saves the first frame only. Use "Save Original" to keep animation.
- **SVG images**: Saved as PNG by default (canvas rendering).
- **Protected CDN URLs**: Some images (e.g., DRM-protected) cannot be converted; original is downloaded instead.

---

Made with ❤️  — MIT License
