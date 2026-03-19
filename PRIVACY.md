# Privacy Policy
**Effective Date: March 19, 2026**

Thank you for using the **Save Image As JPG/PNG/WebP** Chrome Extension. We are highly committed to protecting your privacy.

## 1. Information Collection
**We do not collect, store, or transmit any of your personal information.** 
This extension operates **100% locally** (Client-Side) on your device. We do not use any servers, analytics, or tracking software. We do not monitor your browsing history, and we do not log the images you download or convert.

## 2. Image Processing
All image extractions, format conversions (to JPG, PNG, WebP), and image cropping are performed securely within your own browser via HTML5 Canvas APIs. No image data is ever sent over the internet or uploaded to any third-party server.

## 3. Why We Need Certain Permissions
To function properly, this extension requires a few browser permissions, which are strictly used for their intended purposes:
- **`contextMenus`**: To add the "Save Image As..." options to your right-click menu.
- **`downloads`**: To automatically save the converted or cropped image files directly to your device.
- **`activeTab` & `scripting`**: To temporarily parse the current webpage and extract image data (especially for hard-to-reach CSS background images) when you explicitly interact with the extension.
- **`storage`**: To save your extension preferences (like your default download format and image quality settings) locally on your device.
- **Host Permissions (`<all_urls>`)**: To safely load cross-origin images into the local processing canvas to prevent CORS-blocking errors.

## 4. Open Source Transparency
Our entire source code is fully open-source and available for public review. You can inspect exactly how the extension works by visiting our GitHub repository: [Save-Image-As-JPG-PNG-WebP](https://github.com/diepvantien/Save-Image-As-JPG-PNG-WebP).

## 5. Contact Us
If you have any questions or concerns regarding this Privacy Policy, please feel free to open an issue on our GitHub repository or contact the developer directly.

Your privacy and security are our top priorities!