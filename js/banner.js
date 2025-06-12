(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20;
  const loadImageCount = 8;
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];

  const indices = Array.from({ length: maxImageCount }, (_, i) => i);
  const randomIndices = [];

  while (randomIndices.length < loadImageCount && indices.length > 0) {
    const rand = Math.floor(Math.random() * indices.length);
    randomIndices.push(indices.splice(rand, 1)[0]);
  }

  function createBannerItem(index) {
    const item = document.createElement('div');
    item.className = 'banner-item';

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-box';
    item.appendChild(placeholder);

    let imageLoaded = false;
    for (const ext of extensions) {
      if (imageLoaded) break;

      const candidates = [
        `${imageBasePath}image${index}.${ext}`,
        `${imageBasePath}image${index}.${ext.toUpperCase()}`
      ];

      for (const src of candidates) {
        const img = new Image();
        img.src = src;
        img.className = 'fade-in-image';
        img.loading = 'lazy';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';

        img.onload = () => {
          if (imageLoaded) return;
          imageLoaded = true;

          img.classList.add('loaded');
          item.innerHTML = '';
          item.appendChild(img);
        };

        img.onerror = () => {};
      }
    }

    return item;
  }

  const bannerItems = randomIndices.map(i => createBannerItem(i));

  // 追加两遍实现无缝滚动
  bannerItems.forEach(item => imageContainer.appendChild(item));
  bannerItems.forEach(item => {
    const clone = item.cloneNode(true);
    imageContainer.appendChild(clone);
  });
})();