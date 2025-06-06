(function () {
  const imageContainer = document.getElementById('bannerImages');
  const maxImageCount = 20; // 尝试最多加载 20 张图
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'];
  
  for (let i = 0; i < maxImageCount; i++) {
    (function(index) {
      let found = false;

      extensions.forEach(ext => {
        if (found) return; // 找到了图片就跳过后续尝试
        
        // 先尝试小写
        tryLoadImage(`${imageBasePath}image${index}.${ext}`, () => {
          if (!found) {
            found = true;
          }
        });

        // 再尝试大写
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
          // 图片不存在，不处理
        };
      }
    })(i);
  }
})();
