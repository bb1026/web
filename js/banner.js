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

  // 生成图片元素函数（立即插入 img，不等加载）
  function createBannerItems(indices) {
    return indices.map(index => {
      const item = document.createElement('div');
      item.className = 'banner-item';

      // 直接用 jpg 作为示例，如果你想用多个扩展可以做判断替换
      const img = document.createElement('img');
      img.src = `${imageBasePath}image${index}.jpg`;
      img.className = 'fade-in-image';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';

      item.appendChild(img);
      return item;
    });
  }

  // 先清空容器
  imageContainer.innerHTML = '';

  // 创建两组图片，用于无缝滚动
  const firstGroup = createBannerItems(randomIndices);
  const secondGroup = createBannerItems(randomIndices);

  // 插入两组图片
  firstGroup.forEach(item => imageContainer.appendChild(item));
  secondGroup.forEach(item => imageContainer.appendChild(item));
})();