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

  // 这里定义一个加载图片的函数，加载完马上显示图片
  function loadImage(src, container) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.className = 'fade-in-image';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';

      img.onload = () => {
        container.innerHTML = ''; // 清除占位内容
        container.appendChild(img);
        resolve(true);
      };
      img.onerror = () => resolve(false);
    });
  }

  // 创建 banner-item 容器，包含占位动画
  function createBannerItems() {
    return randomIndices.map(() => {
      const item = document.createElement('div');
      item.className = 'banner-item';

      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder-box';
      item.appendChild(placeholder);

      imageContainer.appendChild(item);
      return item;
    });
  }

  // 初始化：创建两组 bannerItems，实现无缝滚动效果
  const wrappers = createBannerItems();
  // 复制一份 wrappers 实现无缝滚动
  wrappers.forEach(item => {
    const clone = item.cloneNode(true);
    imageContainer.appendChild(clone);
  });

  // 依次加载每个图片，加载后立即显示
  (async function loadAllImages() {
    // 所有图片对应两个位置（原组和克隆组），都加载显示
    const allWrappers = [...imageContainer.children];
    for (let i = 0; i < randomIndices.length; i++) {
      const index = randomIndices[i];

      // 尝试多种扩展名加载，先成功的就用
      let loaded = false;
      for (const ext of extensions) {
        if (loaded) break;

        const candidates = [
          `${imageBasePath}image${index}.${ext}`,
          `${imageBasePath}image${index}.${ext.toUpperCase()}`
        ];

        for (const src of candidates) {
          if (loaded) break;
          loaded = await loadImage(src, allWrappers[i]);         // 原组第 i 个
          if (!loaded) loaded = await loadImage(src, allWrappers[i + randomIndices.length]); // 克隆组对应位置
        }
      }
    }

    startScroll();
  })();

  // 开始无缝滚动动画
  function startScroll() {
    // 计算单组宽度（假设所有 banner-item 宽度一致）
    const firstGroupWidth = Array.from(imageContainer.children)
      .slice(0, randomIndices.length)
      .reduce((sum, el) => sum + el.offsetWidth, 0);

    // 设置宽度（两组）
    imageContainer.style.width = firstGroupWidth * 2 + 'px';

    let start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      let elapsed = timestamp - start;

      // 20秒滚动完一组宽度
      let distance = (elapsed / 20000) * firstGroupWidth;

      // 滚动到一组宽度时重置，实现无缝滚动
      if (distance > firstGroupWidth) {
        start = timestamp;
        distance = 0;
      }

      imageContainer.style.transform = `translateX(${-distance}px)`;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
})();