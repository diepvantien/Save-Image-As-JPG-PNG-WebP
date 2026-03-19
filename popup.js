const SLIDERS = [
  { id: 'q-scale', val: 'v-scale', key: 'image_scale', label: 'Image Size (%)', min: 10, max: 100, step: 10, default: 1.0 },
  { id: 'q-jpg', val: 'v-jpg', key: 'quality_jpg', label: 'JPG Quality (%)', min: 10, max: 100, step: 1, default: 0.92 },
  { id: 'q-webp', val: 'v-webp', key: 'quality_webp', label: 'WebP Quality (%)', min: 10, max: 100, step: 1, default: 0.92 }
];

const GENERAL_TOGGLES = [
  { id: 'opt-saveas', key: 'saveAs', label: 'Ask Where to Save (Save As)', default: false }
];

function renderToggle(t) {
  return `
    <div class="item-toggle">
      <span class="label">${t.label}</span>
      <label class="switch">
        <input type="checkbox" id="${t.id}" />
      </label>
    </div>`;
}

const genContainer = document.getElementById('general-list');
if (genContainer) genContainer.innerHTML = GENERAL_TOGGLES.map(t => `
    <div class="item-toggle">
      <span class="label">${t.label}</span>
      <label class="switch">
        <input type="checkbox" id="${t.id}" />
        <span class="track"></span><span class="thumb"></span>
      </label>
    </div>`).join('');

const sliderContainer = document.getElementById('slider-list');
if (sliderContainer) {
  sliderContainer.innerHTML = SLIDERS.map(s => `
    <div class="item-slider">
      <div class="header">
        <span class="label">${s.label}</span>
        <span class="val" id="${s.val}">100%</span>
      </div>
      <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="100" />
    </div>`).join('');
}

chrome.storage.sync.get(null, (settings) => {
  SLIDERS.forEach(s => {
    const val = Math.round((settings[s.key] ?? s.default) * 100);
    const el = document.getElementById(s.id);
    if(el) {
        el.value = val;
        document.getElementById(s.val).textContent = val + '%';
        el.addEventListener('input', (e) => {
          document.getElementById(s.val).textContent = e.target.value + '%';
        });
    }
  });

  GENERAL_TOGGLES.forEach(t => {
    const el = document.getElementById(t.id);
    if(el) el.checked = settings[t.key] ?? t.default;
  });
});

document.getElementById('btn-save').addEventListener('click', () => {
  const settings = {};
  SLIDERS.forEach(s => settings[s.key] = parseInt(document.getElementById(s.id).value) / 100);
  GENERAL_TOGGLES.forEach(t => settings[t.key] = document.getElementById(t.id).checked);
  
  chrome.storage.sync.set(settings, () => {
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); window.close(); }, 800);
  });
});

document.getElementById('link-feedback').addEventListener('click', (e) => {
  e.preventDefault(); chrome.tabs.create({url: 'mailto:dieptien290620@gmail.com'});
});
document.getElementById('link-github').addEventListener('click', (e) => {
  e.preventDefault(); chrome.tabs.create({url: 'https://github.com/diepvantien'});
});
document.getElementById('link-donate').addEventListener('click', (e) => {
  e.preventDefault(); chrome.tabs.create({url: 'https://buymeacoffee.com/tixuno'});
});
