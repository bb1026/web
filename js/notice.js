// notice.js - 公告栏功能
document.addEventListener('DOMContentLoaded', () => {
  const noticeContainer = document.getElementById('noticeContainer');
  if (!noticeContainer) return;

  // 加载公告内容
  fetch('./notice.html')
    .then(res => {
      if (!res.ok) throw new Error('网络响应不正常');
      return res.text();
    })
    .then(text => {
      const trimmedText = text.trim();
      
      // 空内容处理
      if (!trimmedText) {
        hideNoticeAndAdjustLayout();
        return;
      }
      
      // 插入内容并初始化
      noticeContainer.innerHTML = `<div class="marquee-inner">${trimmedText}</div>`;
      initMarqueeBehavior();
    })
    .catch(err => {
      console.error('公告加载失败:', err);
      hideNoticeAndAdjustLayout();
    });

  // 初始化滚动行为
  function initMarqueeBehavior() {
    const marquee = noticeContainer.querySelector('.marquee-inner');
    if (!marquee) return;
    
    // 检测内容是否需要滚动
    const checkScrollNeeded = () => {
      const containerWidth = noticeContainer.clientWidth;
      const contentWidth = marquee.scrollWidth;
      
      if (contentWidth <= containerWidth) {
        marquee.style.cssText = `
          animation: none;
          padding-left: 0;
          text-align: center;
          width: 100%;
        `;
      } else {
        marquee.style.cssText = `
          animation: marquee 20s linear infinite;
          padding-left: 100%;
          text-align: left;
          width: auto;
        `;
      }
    };
    
    // 初始检查
    checkScrollNeeded();
    
    // 窗口大小变化时重新检查
    window.addEventListener('resize', debounce(checkScrollNeeded, 100));
  }

  // 隐藏公告栏并调整布局
  function hideNoticeAndAdjustLayout() {
    noticeContainer.style.display = 'none';
    document.querySelector('.content').style.marginTop = '70px';
  }

  // 防抖函数
  function debounce(func, wait) {
    let timeout;
    return function() {
      clearTimeout(timeout);
      timeout = setTimeout(func, wait);
    };
  }
});