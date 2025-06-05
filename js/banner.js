(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 50; // 尝试最多加载 50 张图
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  for (let i = 0; i < maxImageCount; i++) {
    (function(index) {
      let found = false;

      extensions.forEach(ext => {
        const img = new Image();
        const src = `${imageBasePath}image${index}.${ext}`;
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
          }
        };
        img.onerror = () => {
          // 图片不存在，不添加
        };
      });
    })(i);
  }
})();
