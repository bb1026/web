(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20;
  const loadImageCount = 5;
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];

  const indices = Array.from({ length: maxImageCount }, (_, i) => i);
  const randomIndices = [];

  while (randomIndices.length < loadImageCount && indices.length > 0) {
    const randomIndex = Math.floor(Math.random() * indices.length);
    randomIndices.push(indices.splice(randomIndex, 1)[0]);
  }

  randomIndices.forEach(index => {
    let found = false;

    extensions.forEach(ext => {
      if (found) return;

      tryLoadImage(`${imageBasePath}image${index}.${ext}`, () => {
        if (!found) found = true;
      });

      tryLoadImage(`${imageBasePath}image${index}.${ext.toUpperCase()}`, () => {
        if (!found) found = true;
      });
    });

    function tryLoadImage(src, onLoadCallback) {
      if (found) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'image-wrapper';

      // 占位图
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      wrapper.appendChild(placeholder);
      imageContainer.appendChild(wrapper);

      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (!found) {
          found = true;

          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '6px';
          img.style.minWidth = '';
          img.style.flexShrink = '0';
          img.className = 'fade-in-image';

          wrapper.innerHTML = ''; // 移除占位
          wrapper.appendChild(img);
          onLoadCallback();
        }
      };
    }
  });
})();