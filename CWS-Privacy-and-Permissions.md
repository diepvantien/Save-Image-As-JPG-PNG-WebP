# Chrome Web Store - Permissions and Privacy Declaration

Below are the detailed answers you need to copy/paste into the declaration forms when uploading your extension to the Chrome Web Store.

---

## 1. Single Purpose
**Single purpose description:**
> This extension allows users to easily configure, convert, crop, and save any image on the web directly into JPG, PNG, or WebP formats via the right-click context menu.

---

## 2. Permission Justifications

* **Justification for `contextMenus`:**
> Used to add the "Save Image As..." and "Crop & Save Image..." options to the context menu when a user right-clicks on an image.

* **Justification for `downloads`:**
> Used to automatically download the converted image file (JPG, PNG, WebP) or the cropped image directly to the user's device.

* **Justification for `activeTab`:**
> Used to grant temporary access to the current tab when the user triggers the context menu to extract image data without tracking other tabs.

* **Justification for `scripting`:**
> Used to inject scripts for extracting hidden images (e.g., CSS background-image), complex image elements, and initializing the crop selection interface directly on the current webpage.

* **Justification for `storage`:**
> Used to save the user's local extension settings from the popup (e.g., default save format, image quality percentage).

* **Justification for `unlimitedStorage`:**
> Used to handle and temporarily buffer abnormally large Base64 image data strings during the conversion and Canvas rendering process without hitting browser memory limits.

* **Justification for Host permissions (`<all_urls>`):**
> Used to fetch cross-origin image resources (bypassing CORS restrictions) into the OffscreenCanvas for format conversion and cropping functionality across all websites requested by the user.

---

## 3. Are you using remote code?
* **Select Option:**
> 🔘 **No, I am not using remote code**
*(The extension processes entirely locally).*

---

## 4. Data Usage

**What kind of user data do you intend to collect now or in the future?**
* **Selection:** LEAVE ALL CHECKBOXES EMPTY.
*(Because the extension processes images 100% locally on the user's browser, there is no server and no tracking).*

**I confirm that the following disclosure information is true:**
You must check **ALL 3 CHECKBOXES** shown below:
* [x] I do not sell or transfer user data to third parties...
* [x] I do not use or transfer user data for purposes completely unrelated...
* [x] I do not use or transfer user data to determine creditworthiness...

---

## 5. Privacy Policy

**Privacy policy URL:**
> `https://github.com/diepvantien/Save-Image-As-JPG-PNG-WebP/blob/main/PRIVACY.md`
