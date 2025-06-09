(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20;
  const loadImageCount = 5;
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];

  const placeholderWrappers = [];

  // 插入占位图（5 个）
  for (let i = 0; i < loadImageCount; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper placeholder';
    wrapper.innerHTML = `<div class="placeholder-box"></div>`;
    imageContainer.appendChild(wrapper);
    placeholderWrappers.push(wrapper);
  }

  // 随机不重复索引
  const indices = Array.from({ length: maxImageCount }, (_, i) => i);
  const randomIndices = [];

  while (randomIndices.length < loadImageCount && indices.length > 0) {
    const randomIndex = Math.floor(Math.random() * indices.length);
    randomIndices.push(indices.splice(randomIndex, 1)[0]);
  }

  // 尝试加载真实图并替换占位
  randomIndices.forEach((index, i) => {
    let found = false;

    extensions.forEach(ext => {
      if (found) return;
      tryLoadImage(`${imageBasePath}image${index}.${ext}`, i);
      tryLoadImage(`${imageBasePath}image${index}.${ext.toUpperCase()}`, i);
    });

    function tryLoadImage(src, position) {
      if (found) return;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (found) return;
        found = true;

        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.loading = 'lazy';

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.appendChild(img);

        // 替换对应的占位 wrapper
        imageContainer.replaceChild(wrapper, placeholderWrappers[position]);
      };
      img.onerror = () => {};
    }
  });
})();