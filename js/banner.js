<div id="bannerImages" style="display:flex; gap:10px;"></div>

<!-- 大图遮罩层 -->
<div id="imageModal" style="
  display:none;
  position:fixed;
  top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.8);
  justify-content: center;
  align-items: center;
  z-index: 9999;
">
  <img id="modalImage" src="" style="max-width:90%; max-height:90%; border-radius:8px; box-shadow:0 0 10px #000;">
</div>

<script>
(function () {
  const imageContainer = document.getElementById('bannerImages');
  const imageModal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const maxImageCount = 50;
  const imageBasePath = 'imgs/';
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];

  function padNum(num) {
    return num.toString().padStart(4, '0');
  }

  // 点击遮罩层关闭大图
  imageModal.onclick = () => {
    imageModal.style.display = 'none';
    modalImage.src = '';
  };

  for (let i = 0; i < maxImageCount; i++) {
    (function(index) {
      let found = false;

      extensions.forEach(ext => {
        if (found) return;

        const filenameBase = `IMG_${padNum(index)}`;

        tryLoadImage(`${imageBasePath}${filenameBase}.${ext}`, () => {
          if (!found) {
            found = true;
          }
        });

        tryLoadImage(`${imageBasePath}${filenameBase}.${ext.toUpperCase()}`, () => {
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
            img.style.cursor = 'pointer'; // 鼠标变手指，提示可点
            imageContainer.appendChild(img);

            // 点击显示大图
            img.onclick = (e) => {
              modalImage.src = img.src;
              imageModal.style.display = 'flex';
            };

            onLoadCallback();
          }
        };
        img.onerror = () => {};
      }
    })(i);
  }
})();
</script>