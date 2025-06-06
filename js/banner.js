(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20;
  const loadImageCount = 5; // 每次随机加载 5 张图
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];

  // 随机选取不重复的 5 个索引
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
        if (!found) {
          found = true;
        }
      });

      tryLoadImage(`${imageBasePath}image${index}.${ext.toUpperCase()}`, () => {
        if (!found) {
          found = true;
        }
      });
    });

    function tryLoadImage(src, onLoadCallback) {
      if (found) return;
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (!found) {
          found = true;
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '6px';
          img.style.minWidth = '300px';
          img.style.flexShrink = '0';
          imageContainer.appendChild(img);
          onLoadCallback();
        }
      };
      img.onerror = () => {
        // 图片不存在，忽略
      };
    }
  });
})();