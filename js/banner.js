(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20;       // 最大可用图片数
  const loadImageCount = 8;       // 实际随机加载数量
  const imageBasePath = 'imgs/';  // 图片路径
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif']; // 支持扩展名

  const indices = Array.from({ length: maxImageCount }, (_, i) => i);
  const randomIndices = [];

  // 随机选出不重复的图片索引
  while (randomIndices.length < loadImageCount && indices.length > 0) {
    const rand = Math.floor(Math.random() * indices.length);
    randomIndices.push(indices.splice(rand, 1)[0]);
  }

  // 创建 banner-item 容器，包含占位动画
  const wrappers = randomIndices.map(() => {
    const item = document.createElement('div');
    item.className = 'banner-item';

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-box';
    item.appendChild(placeholder);

    imageContainer.appendChild(item);
    return item;
  });

  // 为每个 wrapper 尝试加载实际图片
  randomIndices.forEach((index, i) => {
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
          const wrapper = wrappers[i];
          wrapper.innerHTML = ''; // 清除占位内容
          wrapper.appendChild(img);
        };

        img.onerror = () => {};
      }
    }
  });

  // 🚀 添加：克隆已有图片，实现无缝滚动
  const cloneImages = () => {
    const items = Array.from(imageContainer.children);
    const cloneTimes = 2; // 克隆次数
    for (let i = 0; i < cloneTimes; i++) {
      items.forEach(item => {
        const clone = item.cloneNode(true);
        imageContainer.appendChild(clone);
      });
    }
  };

  // 等待图片加载完成后克隆（确保尺寸正确）
  window.addEventListener('load', () => {
    cloneImages();
  });
})();