document.addEventListener('DOMContentLoaded', function() {
  // 创建外层包裹容器
  const galleryWrapper = document.createElement('div');
  galleryWrapper.style.position = 'relative';
  galleryWrapper.style.margin = '20px 0';
  galleryWrapper.style.overflow = 'hidden';
  
  // 图片主容器
  const galleryContainer = document.createElement('div');
  galleryContainer.className = 'image-gallery-container';
  galleryContainer.style.position = 'relative';
  galleryContainer.style.width = '100%';
  galleryContainer.style.overflow = 'hidden';
  galleryContainer.style.backgroundColor = '#f5f5f5';
  galleryContainer.style.borderRadius = '8px';
  galleryContainer.style.padding = '20px 0';

  // 滚动容器
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'image-gallery-scroll';
  scrollContainer.style.width = '100%';
  scrollContainer.style.overflowX = 'auto';
  scrollContainer.style.overflowY = 'hidden';
  scrollContainer.style.padding = '10px 0';
  scrollContainer.style.webkitOverflowScrolling = 'touch';

  // 图片画廊
  const gallery = document.createElement('div');
  gallery.className = 'image-gallery';
  gallery.style.display = 'flex';
  gallery.style.position = 'relative';
  gallery.style.left = '0';
  gallery.style.gap = '20px';
  gallery.style.willChange = 'transform';

  // 加载覆盖层
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.style.display = 'none';
  loadingOverlay.style.position = 'absolute';
  loadingOverlay.style.top = '0';
  loadingOverlay.style.left = '0';
  loadingOverlay.style.right = '0';
  loadingOverlay.style.bottom = '0';
  loadingOverlay.style.backgroundColor = 'rgba(255,255,255,0.8)';
  loadingOverlay.style.zIndex = '10';
  loadingOverlay.style.justifyContent = 'center';
  loadingOverlay.style.alignItems = 'center';
  loadingOverlay.style.flexDirection = 'column';
  loadingOverlay.innerHTML = '<div class="spinner" style="font-size:16px;color:#333;">正在加载图片...</div>';

  // 组装图片区域结构
  scrollContainer.appendChild(gallery);
  galleryContainer.appendChild(loadingOverlay);
  galleryContainer.appendChild(scrollContainer);

  // 创建控制按钮组 - 修改为靠右对齐
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'gallery-controls';
  controlsContainer.style.display = 'flex';
  controlsContainer.style.justifyContent = 'flex-end';
  controlsContainer.style.gap = '10px';
  controlsContainer.style.marginBottom = '15px';
  controlsContainer.style.width = '100%';

  // 换一批按钮
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'gallery-btn';
  refreshBtn.textContent = '换一批';
  refreshBtn.style.padding = '8px 16px';
  refreshBtn.style.backgroundColor = '#4CAF50';
  refreshBtn.style.color = 'white';
  refreshBtn.style.border = 'none';
  refreshBtn.style.borderRadius = '4px';
  refreshBtn.style.cursor = 'pointer';
  refreshBtn.style.fontSize = '14px';
  refreshBtn.style.transition = 'background-color 0.3s';
  refreshBtn.disabled = true;
  refreshBtn.style.opacity = refreshBtn.disabled ? '0.6' : '1';

  // 更多按钮
  const moreBtn = document.createElement('button');
  moreBtn.className = 'gallery-btn more-btn';
  moreBtn.textContent = '更多';
  moreBtn.style.padding = '8px 16px';
  moreBtn.style.marginRight = '20px';
  moreBtn.style.backgroundColor = '#2196F3';
  moreBtn.style.color = 'white';
  moreBtn.style.border = 'none';
  moreBtn.style.borderRadius = '4px';
  moreBtn.style.cursor = 'pointer';
  moreBtn.style.fontSize = '14px';
  moreBtn.style.transition = 'background-color 0.3s';
  moreBtn.addEventListener('click', () => {
    window.open('/pages/gallery.html', '_blank');
  });

  // 添加按钮到按钮组
  controlsContainer.appendChild(refreshBtn);
  controlsContainer.appendChild(moreBtn);

  // 组装完整结构
  galleryWrapper.appendChild(controlsContainer);
  galleryWrapper.appendChild(galleryContainer);

  // 插入到页面
  document.querySelector('.content').insertAdjacentElement('beforebegin', galleryWrapper);

  // 配置参数
  const CONFIG = {
    visibleImageCount: 5,   // 每次显示5张图片
    totalImages: 20,        // 图片总数20张
    baseUrl: '/imgs/',
    formats: ['webp', 'jpg', 'png', 'jpeg']
  };

  // 图片点击事件处理
  gallery.addEventListener('click', function(e) {
    const imgElement = e.target.closest('.image-gallery-item img');
    if (imgElement && imgElement.dataset.url) {
      e.preventDefault();
      window.open(imgElement.dataset.url, '_blank', 'noopener,noreferrer');
    }
  });

  // 加载图片函数
  // 加载图片函数
  async function loadImages() {
    loadingOverlay.style.display = 'flex';
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = '0.6';
    gallery.innerHTML = '';
    
    // 生成5个不重复的随机ID（从1到20）
    const imageIds = [];
    while(imageIds.length < CONFIG.visibleImageCount) {
      const randomId = Math.floor(Math.random() * CONFIG.totalImages) + 1;
      if(!imageIds.includes(randomId)) {
        imageIds.push(randomId);
      }
    }
    
    // 并行加载图片
    const loadPromises = imageIds.map(async (id) => {
      const item = document.createElement('div');
      item.className = 'image-gallery-item';
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
      return item;
    });
    
    // 等待所有图片加载完成
    await Promise.all(loadPromises);
    
    updateGalleryWidth();
    restartAnimation();
    refreshBtn.disabled = false;
    refreshBtn.style.opacity = '1';
    loadingOverlay.style.display = 'none';
  }
  
  // 更新画廊宽度
  function updateGalleryWidth() {
    const items = gallery.querySelectorAll('.image-gallery-item');
    if(items.length > 0) {
      const itemWidth = window.innerWidth <= 768 ? 150 : 200;
      const gap = 20;
      
      // 移除之前可能存在的克隆元素
      const existingClones = gallery.querySelectorAll('.image-clone');
      existingClones.forEach(clone => clone.remove());
      
      // 设置画廊宽度为两倍，用于无缝循环
      gallery.style.width = `${(itemWidth + gap) * items.length * 2}px`;
      
      // 复制多份图片用于无缝循环（至少复制3份以确保流畅）
      for(let i = 0; i < 3; i++) {
        items.forEach(item => {
          const clone = item.cloneNode(true);
          clone.classList.add('image-clone');
          gallery.appendChild(clone);
        });
      }
    }
  }
  
  // 重启动画
  function restartAnimation() {
    // 移除现有动画
    gallery.style.animation = 'none';
    void gallery.offsetWidth; // 触发重绘
    
    // 计算动画参数
    const itemWidth = window.innerWidth <= 768 ? 150 : 200;
    const gap = 20;
    const items = gallery.querySelectorAll('.image-gallery-item');
    const actualItemCount = items.length / 4; // 因为复制了3份，所以总数是原来的4倍
    const totalWidth = (itemWidth + gap) * actualItemCount;
    
    // 动态添加关键帧
    const styleTag = document.createElement('style');
    styleTag.id = 'marqueeAnimationStyle';
    styleTag.textContent = `
      @keyframes marqueeAnimation {
        0% { transform: translateX(0); }
        100% { transform: translateX(-${totalWidth}px); }
      }
    `;
    
    // 移除旧的样式标签
    const oldStyleTag = document.getElementById('marqueeAnimationStyle');
    if (oldStyleTag) {
      document.head.removeChild(oldStyleTag);
    }
    document.head.appendChild(styleTag);
    
    // 应用新动画
    gallery.style.animation = `marqueeAnimation ${totalWidth / 30}s linear infinite`;
    
    // 监听动画迭代事件，实现无缝循环
    gallery.addEventListener('animationiteration', () => {
      // 在每次动画迭代时，将画廊位置重置到初始状态
      gallery.style.transform = 'translateX(0)';
    });
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
  
  // 换一批按钮事件
  refreshBtn.addEventListener('click', loadImages);
  
  // 窗口resize事件
  window.addEventListener('resize', () => {
    updateGalleryWidth();
    restartAnimation();
  });
  
  // 初始加载
  loadImages();

  // 添加CSS样式到文档头部
  const style = document.createElement('style');
  style.textContent = `
    .image-gallery:hover {
      animation-play-state: paused;
    }
    
    .image-gallery-item img:hover {
      transform: scale(1.02);
    }
    
    .gallery-btn:hover {
      background: #0252b4 !important;
    }
    
    @media (max-width: 768px) {
      body {
        padding-top: 100px;
      }
      
      .image-gallery-container {
        min-height: 180px;
        margin: 10px auto 20px;
      }
    }
  `;
  document.head.appendChild(style);
});