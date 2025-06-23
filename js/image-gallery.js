document.addEventListener('DOMContentLoaded', function() {
  // 容器结构
  const galleryContainer = document.createElement('div');
  galleryContainer.className = 'image-gallery-container';
  
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'image-gallery-scroll';
  
  const gallery = document.createElement('div');
  gallery.className = 'image-gallery';
  
  // 加载覆盖层
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = '<div class="spinner">正在加载图片...</div>';
  
  // 组装结构
  scrollContainer.appendChild(gallery);
  galleryContainer.appendChild(loadingOverlay);
  galleryContainer.appendChild(scrollContainer);
  
  // 插入到页面
  document.querySelector('.content').insertAdjacentElement('beforebegin', galleryContainer);
  
  // 配置参数
  const CONFIG = {
    visibleImageCount: 5, // 可视区域内显示的图片数量
    baseUrl: 'https://www.0515364.xyz/imgs/',
    formats: ['webp', 'jpg', 'png', 'jpeg'],
    maxId: 20,
    loadMultiplier: 2 // 加载图片数量倍数（实现无缝循环）
  };
  
  // 事件委托处理图片点击
  gallery.addEventListener('click', function(e) {
    const imgElement = e.target.closest('.image-gallery-item img');
    if (imgElement && imgElement.dataset.url) {
      e.preventDefault();
      window.open(imgElement.dataset.url, '_blank', 'noopener,noreferrer');
    }
  });
  
  // 加载图片函数（最终修复版）
  async function loadImages() {
    loadingOverlay.style.display = 'flex';
    gallery.innerHTML = '';
    
    // 生成不重复的随机ID（双倍数量用于循环）
    const imageIds = [];
    const totalToLoad = CONFIG.visibleImageCount * CONFIG.loadMultiplier;
    
    while(imageIds.length < totalToLoad && imageIds.length < CONFIG.maxId) {
      const id = Math.floor(Math.random() * CONFIG.maxId) + 1;
      // 确保相邻图片不相同
      if(imageIds.length === 0 || id !== imageIds[imageIds.length-1]) {
        imageIds.push(id);
      }
    }
    
    // 并行加载图片
    await Promise.all(imageIds.map(async (id) => {
      const item = document.createElement('div');
      item.className = 'image-gallery-item';
      
      const img = document.createElement('img');
      img.alt = `图片 ${id}`;
      
      // 尝试不同格式
      for(const format of CONFIG.formats) {
        const imgUrl = `${CONFIG.baseUrl}image${id}.${format}`;
        try {
          const exists = await testImage(imgUrl);
          if(exists) {
            img.src = imgUrl;
            img.dataset.url = imgUrl;
            break;
          }
        } catch(e) {
          console.warn(`图片加载失败: ${imgUrl}`);
        }
      }
      
      // 使用占位图如果所有格式都失败
      if(!img.src) {
        img.src = createPlaceholder(id);
        img.style.opacity = '0.7';
      }
      
      item.appendChild(img);
      gallery.appendChild(item);
    }));
    
    // 设置画廊总宽度
    updateGalleryWidth();
    
    // 强制重启动画
    restartAnimation();
    
    loadingOverlay.style.display = 'none';
  }
  
  // 更新画廊宽度（响应式）
  function updateGalleryWidth() {
    const items = gallery.querySelectorAll('.image-gallery-item');
    if(items.length > 0) {
      const itemWidth = window.innerWidth <= 768 ? 150 : 200;
      const gap = window.innerWidth <= 768 ? 15 : 20;
      gallery.style.width = `${(itemWidth + gap) * items.length}px`;
    }
  }
  
  // 重启动画确保流畅
  function restartAnimation() {
    gallery.style.animation = 'none';
    void gallery.offsetWidth; // 触发重绘
    gallery.style.animation = 'marquee 30s linear infinite';
    
    // 移动端调整动画速度
    if(window.innerWidth <= 768) {
      gallery.style.animationDuration = '20s';
    }
  }
  
  // 图片存在性检测
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
  
  // 刷新按钮
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'refresh-btn';
  refreshBtn.innerHTML = '换一批';
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    await loadImages();
    refreshBtn.disabled = false;
  });
  
  document.body.appendChild(refreshBtn);
  
  // 窗口大小改变时重新计算
  window.addEventListener('resize', () => {
    updateGalleryWidth();
    restartAnimation();
  });
  
  // 初始加载
  loadImages();
});