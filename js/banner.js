(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20;
  const loadImageCount = 8;
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];

  const indices = Array.from({ length: maxImageCount }, (_, i) => i);
  const randomIndices = [];

  // 选择随机的不重复索引
  while (randomIndices.length < loadImageCount && indices.length > 0) {
    const randomIndex = Math.floor(Math.random() * indices.length);
    randomIndices.push(indices.splice(randomIndex, 1)[0]);
  }

  // 先创建 image-wrapper（含占位图）
  const wrappers = randomIndices.map(() => {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-box';

    wrapper.appendChild(placeholder);
    imageContainer.appendChild(wrapper);
    return wrapper;
  });

  // 尝试为每个 wrapper 加载实际图片
  randomIndices.forEach((index, i) => {
    let found = false;

    for (const ext of extensions) {
      if (found) break;

      const trySrcs = [`${imageBasePath}image${index}.${ext}`, `${imageBasePath}image${index}.${ext.toUpperCase()}`];
      for (const src of trySrcs) {
        if (found) break;

        const img = new Image();
        img.src = src;
        img.className = 'fade-in-image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onload = () => {
          if (found) return;
          found = true;

          const wrapper = wrappers[i];
          wrapper.innerHTML = ''; // 移除占位图
          wrapper.appendChild(img);
        };
        img.onerror = () => {};
      }
    }
  });
})();