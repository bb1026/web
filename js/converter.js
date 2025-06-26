const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const imagePreview = document.getElementById('imagePreview');
const qualityRange = document.getElementById('qualityRange');
const qualityValue = document.getElementById('qualityValue');
const convertAllBtn = document.getElementById('convertAllBtn');
const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const floatingPreview = document.getElementById('floatingPreview');
const renameInput = document.getElementById('renameInput');
const renameStart = document.getElementById('renameStart');
const watermarkTextInput = document.getElementById('watermarkText');
const watermarkOpacitySlider = document.getElementById('watermarkOpacity');
const watermarkOpacityValue = document.getElementById('watermarkOpacityValue');

let images = [];

selectFilesBtn.onclick = () => fileInput.click();
qualityRange.oninput = () => qualityValue.textContent = `${qualityRange.value}%`;
watermarkOpacitySlider.oninput = () => watermarkOpacityValue.textContent = `${watermarkOpacitySlider.value}%`;

fileInput.onchange = () => {
  [...fileInput.files].forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        images.push({ file, originalUrl: e.target.result, converted: null });
        renderImages();
      };
      reader.readAsDataURL(file);
    }
  });
};

function renderImages() {
  imagePreview.innerHTML = '';
  images.forEach(img => {
    const card = document.createElement('div');
    card.className = 'image-card';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input me-2';
    checkbox.onchange = updateDownloadButtons;
    img.checkbox = checkbox;

    const name = document.createElement('div');
    name.className = 'image-name';
    name.textContent = img.file.name;
    name.onmouseenter = () => {
      floatingPreview.src = img.originalUrl;
      floatingPreview.style.display = 'block';
    };
    name.onmouseleave = () => floatingPreview.style.display = 'none';

    const size = document.createElement('div');
    size.className = 'image-size';
    size.textContent = `${(img.file.size / 1024).toFixed(1)} KB`;

    card.appendChild(checkbox);
    card.appendChild(name);
    card.appendChild(size);

    if (img.converted) {
      const link = document.createElement('a');
      link.href = img.converted.url;
      link.textContent = img.converted.name;
      link.className = 'image-size';
      link.style.color = 'green';
      link.target = '_blank';
      card.appendChild(link);
    }

    imagePreview.appendChild(card);
  });

  convertAllBtn.disabled = images.length === 0;
  updateDownloadButtons();
}

convertAllBtn.onclick = async () => {
  const quality = parseInt(qualityRange.value) / 100;
  const format = document.querySelector('input[name="format"]:checked').value;
  const baseName = renameInput.value.trim();
  const startIndex = parseInt(renameStart.value) || 1;
  const watermarkText = watermarkTextInput.value.trim();
  const watermarkOpacity = parseInt(watermarkOpacitySlider.value) / 100;
  const position = document.querySelector('input[name="position"]:checked').value;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const blob = await convertImageWithWatermark(img.file, format, quality, watermarkText, watermarkOpacity, position);
    const url = URL.createObjectURL(blob);
    const indexStr = String(startIndex + i).padStart(2, '0');
    const name = baseName ? `${baseName}${indexStr}.${format}` : img.file.name.replace(/\.[^.]+$/, '') + '.' + format;
    img.converted = { blob, url, name };
  }
  renderImages();
};

async function convertImageWithWatermark(file, format, quality, watermark, opacity, position) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      if (watermark) {
        ctx.globalAlpha = opacity;
        ctx.font = `${Math.floor(img.height / 20)}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 1;

        const textWidth = ctx.measureText(watermark).width;
        const textHeight = parseInt(ctx.font, 10);

        let x = 0, y = 0;
        if (position.includes('left')) x = 10;
        if (position.includes('center')) x = (img.width - textWidth) / 2;
        if (position.includes('right')) x = img.width - textWidth - 10;
        if (position.includes('top')) y = 10;
        if (position.includes('center')) y = (img.height - textHeight) / 2;
        if (position.includes('bottom')) y = img.height - textHeight - 10;

        ctx.fillText(watermark, x, y);
      }

      canvas.toBlob(blob => blob ? resolve(blob) : reject(), `image/${format}`, quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

downloadSelectedBtn.onclick = async () => {
  const zip = new JSZip();
  const selected = images.filter(i => i.checkbox.checked && i.converted);
  if (!selected.length) return alert('请选择图片');
  for (let img of selected) {
    zip.file(img.converted.name, img.converted.blob);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'selected_images.zip');
};

downloadAllBtn.onclick = async () => {
  const zip = new JSZip();
  const converted = images.filter(i => i.converted);
  if (!converted.length) return alert('请先转换图片');
  for (let img of converted) {
    zip.file(img.converted.name, img.converted.blob);
  }
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'all_images.zip');
};

function updateDownloadButtons() {
  downloadSelectedBtn.disabled = !images.some(i => i.checkbox.checked && i.converted);
  downloadAllBtn.disabled = !images.some(i => i.converted);
}

document.addEventListener('mousemove', e => {
  if (floatingPreview.style.display === 'block') {
    floatingPreview.style.left = `${e.pageX + 20}px`;
    floatingPreview.style.top = `${e.pageY + 20}px`;
  }
});