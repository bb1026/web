document.addEventListener('DOMContentLoaded', function() {

  // 配置参数
  const CONFIG = {
    visibleCount: 8, // 显示的数量
    totalImages: 20, // 总图片数量
    baseUrl: 'https://www.0515364.xyz/imgs/',
    formats: ['webp', 'avif', 'jpg', 'png', 'jpeg', 'gif'], // 图片格式
    scrollSpeed: 3, // 滚动速度(秒/图片)
	  gap: 15 // 图片间距
  };

  // 容器元素
  const container = document.getElementById('imageGalleryContainer');
  if (!container) return;

  // 创建DOM结构
  container.innerHTML = `
    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px; margin-bottom: 5px; width: 99%;">
      <button id="refreshBtn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background-color 0.3s; opacity: 0.6;" disabled>换一批</button>
      <button id="moreBtn" style="padding: 8px 16px; margin-right: 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background-color 0.3s;">更多</button>
    </div>
    <div style="position: relative; width: 90%; overflow: hidden; background: #f5f5f5; border-radius: 8px; padding: 20px 0; margin-left: 20px; margin-right: 20px; margin-bottom: 20px;">
      <div class="loading-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); z-index: 10; justify-content: center; align-items: center; flex-direction: column;">
        <div style="font-size: 16px; color: #333;">正在加载图片...</div>
      </div>
      <div id="galleryWrapper" style="width: 100%; overflow-x: hidden; padding: 10px 0;">
        <div id="mainGallery" style="display: flex; position: relative; left: 0; gap: ${CONFIG.gap}px; will-change: transform;"></div>
      </div>
    </div>
  `;

  // 获取关键元素
  const gallery = document.getElementById('mainGallery');
  const galleryWrapper = document.getElementById('galleryWrapper');
  const refreshBtn = document.getElementById('refreshBtn');
  const moreBtn = document.getElementById('moreBtn');
  const loadingOverlay = document.querySelector('.loading-overlay');

  // 更多按钮事件
  moreBtn.addEventListener('click', () => {
    window.open('/pages/gallery.html', '_blank');
  });

  // 图片点击事件
  gallery.addEventListener('click', (e) => {
    const img = e.target.closest('.gallery-item img');
    if (img?.dataset.url) {
      window.open(img.dataset.url, '_blank', 'noopener,noreferrer');
    }
  });

  // 加载图片函数
  async function loadImages() {
    loadingOverlay.style.display = 'flex';
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.6';
    gallery.innerHTML = '';

    // 生成随机ID
    const imageIds = [];
    while (imageIds.length < CONFIG.visibleCount) {
      const id = Math.floor(Math.random() * CONFIG.totalImages) + 1;
      if (!imageIds.includes(id)) imageIds.push(id);
    }

    // 并行加载图片
    await Promise.all(imageIds.map(async (id) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.style.flexShrink = '0';
      item.style.width = window.innerWidth <= 768 ? '150px' : '200px';
      item.style.height = window.innerWidth <= 768 ? '150px' : '200px';
      item.style.position = 'relative';
      item.style.borderRadius = '4px';
      item.style.overflow = 'hidden';
      item.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
      item.style.transition = 'transform 0.3s';

      const img = document.createElement('img');
      img.alt = `图片 ${id}`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.transition = 'opacity 0.3s';

      // 尝试加载图片
      for (const format of CONFIG.formats) {
        const url = `${CONFIG.baseUrl}image${id}.${format}`;
        try {
          if (await testImage(url)) {
            img.src = url;
            img.dataset.url = url;
            break;
          }
        } catch (e) {
          console.warn(`图片加载失败: ${url}`);
        }
      }

      // 使用占位图
      if (!img.src) {
        img.src = createPlaceholder(id);
        img.style.opacity = '0.7';
      }

      item.appendChild(img);
      gallery.appendChild(item);
    }));

    setupAnimation();
    refreshBtn.disabled = false;
    refreshBtn.style.opacity = '1';
    loadingOverlay.style.display = 'none';
  }

  // 设置动画
  function setupAnimation() {
    // 移除现有动画
    gallery.style.animation = 'none';
    gallery.style.transform = 'translateX(0)';
    void gallery.offsetWidth;

    const items = gallery.querySelectorAll('.gallery-item');
    if (!items.length) return;

    // 计算参数
    const itemWidth = window.innerWidth <= 768 ? 150 : 200;
    const moveDistance = itemWidth + CONFIG.gap;

    // 添加动画样式
    const style = document.createElement('style');
    style.id = 'marqueeAnimationStyle';
    style.textContent = `
      @keyframes marqueeAnimation {
        0% { transform: translateX(0); }
        100% { transform: translateX(-${moveDistance}px); }
      }
      .gallery-item:hover img { transform: scale(1.02); }
      #refreshBtn:hover { background: #3e8e41 !important; }
      #moreBtn:hover { background: #0d8bf2 !important; }
      @media (max-width: 768px) {
        body { padding-top: 100px; }
      }
    `;
    
    // 更新样式
    const oldStyle = document.getElementById('marqueeAnimationStyle');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);

    // 使用requestAnimationFrame实现平滑过渡
    let animationId;
    let startTime;
    const duration = CONFIG.scrollSpeed * 1000; // 转换为毫秒

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;
      
      if (progress >= 1) {
        // 动画完成，移动第一个元素到末尾
        const firstItem = gallery.firstElementChild;
        if (firstItem) {
          gallery.appendChild(firstItem);
          gallery.style.transform = 'translateX(0)';
          startTime = timestamp; // 重置开始时间
        }
      } else {
        // 继续动画
        gallery.style.transform = `translateX(-${moveDistance * progress}px)`;
      }
      
      animationId = requestAnimationFrame(animate);
    }

    function startAnimation() {
      cancelAnimationFrame(animationId);
      gallery.style.transform = 'translateX(0)';
      startTime = null;
      animationId = requestAnimationFrame(animate);
    }

    // 鼠标悬停暂停
    galleryWrapper.addEventListener('mouseenter', () => {
      cancelAnimationFrame(animationId);
    });

    galleryWrapper.addEventListener('mouseleave', startAnimation);

    // 开始动画
    startAnimation();

    // 窗口大小改变时重新开始动画
    const resizeHandler = () => {
      startAnimation();
    };
    window.addEventListener('resize', resizeHandler);

    // 清理函数
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeHandler);
      galleryWrapper.removeEventListener('mouseenter', () => {});
      galleryWrapper.removeEventListener('mouseleave', startAnimation);
    };
  }

  // 图片存在检测
  function testImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // 创建占位图
  function createPlaceholder(id) {
    const color = `hsl(${id * 3.6}, 70%, 85%)`;
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="100" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="#666">
        image${id}
      </text>
    </svg>`;
  }

  // 事件监听
  refreshBtn.addEventListener('click', () => {
    const cleanup = setupAnimation(); // 获取清理函数
    if (cleanup) cleanup(); // 清理旧动画
    loadImages();
  });
  window.addEventListener('resize', () => {
    const cleanup = setupAnimation(); // 获取清理函数
    if (cleanup) cleanup(); // 清理旧动画
  });

  // 初始加载
  loadImages();
});