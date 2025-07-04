// merged-all.js - 合并了 header-notice-footer.js 和 main.js 的功能

document.addEventListener('DOMContentLoaded', () => {
  // ==================== 头部logo部分 ====================
  const headerContent = document.querySelector('.header-main');
  
  if (headerContent) {
    headerContent.innerHTML = `
      <div class="header-content">
        <a href="/">
          <img src="/imgs/apple-touch-icon.png" alt="Logo" class="logo">
        </a>
        <div class="title-container">
          <a href="/">
            <span class="site-title">🧰在线小工具</span>
          </a>
        </div>
      </div>
    `;
  }

  // ==================== 公告栏部分 ====================
  const noticeContainer = document.getElementById('noticeContainer');
  if (noticeContainer) {
    fetch('./notice.html')
      .then(res => {
        if (!res.ok) throw new Error('网络响应不正常');
        return res.text();
      })
      .then(text => {
        const trimmedText = text.trim();
        if (!trimmedText) {
          hideNoticeAndAdjustLayout();
          return;
        }
        noticeContainer.innerHTML = `<div class="marquee-inner">${trimmedText}</div>`;
        initMarqueeBehavior();
      })
      .catch(err => {
        console.error('公告加载失败:', err);
        hideNoticeAndAdjustLayout();
      });

    function initMarqueeBehavior() {
      const marquee = noticeContainer.querySelector('.marquee-inner');
      if (!marquee) return;
      
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
      
      checkScrollNeeded();
      window.addEventListener('resize', debounce(checkScrollNeeded, 100));
    }

    function hideNoticeAndAdjustLayout() {
      noticeContainer.style.display = 'none';
      const content = document.querySelector('.content');
      if (content) {
        content.style.marginTop = '70px';
      }
    }
  }

  // ==================== 菜单功能部分 ====================
  let allData = {};
  const maxDisplay = 6;
  const excludedCategories = ['首页', '关于'];

  function renderMenu() {
    const container = document.getElementById('menuContainer');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(allData).forEach(([cat, tools]) => {
      if (excludedCategories.includes(cat) || !tools || tools.length === 0) return;

      const section = document.createElement('div');
      section.className = 'category';
      section.innerHTML = `<h2>${cat}</h2>`;
      let toolList = document.createElement('div');
      toolList.className = 'tool-list';

      const normalizedTools = Array.isArray(tools[0]) ? tools : [[cat, tools]];
      const itemsToShow = normalizedTools.slice(0, maxDisplay);
      
      itemsToShow.forEach(([name, href]) => {
        const a = document.createElement('a');
        a.className = 'tool-item';
        a.href = href;
        a.textContent = name;
        toolList.appendChild(a);
      });

      section.appendChild(toolList);

      if (normalizedTools.length > maxDisplay) {
        let expanded = false;
        const more = document.createElement('button');
        more.className = 'more-link';
        more.textContent = '展开...';
        
        more.onclick = (e) => {
          e.preventDefault();
          expanded = !expanded;

          const newList = toolList.cloneNode(false);
          newList.innerHTML = '';
    
          const visible = expanded ? normalizedTools : normalizedTools.slice(0, maxDisplay);
          
          visible.forEach(([name, href]) => {
            const a = document.createElement('a');
            a.className = 'tool-item';
            a.href = href;
            a.textContent = name;
            newList.appendChild(a);
          });

          toolList.parentNode.insertBefore(newList, toolList);
          toolList.remove();
          toolList = newList;

          more.textContent = expanded ? '收起...' : '展开...';
        };
        
        section.appendChild(more);
      }

      container.appendChild(section);
    });
  }

  // 加载菜单数据
  fetch('/json/menu.json')
    .then(response => response.json())
    .then(data => {
      allData = Object.entries(data).reduce((acc, [cat, items]) => {
        if (!excludedCategories.includes(cat)) {
          acc[cat] = Array.isArray(items) ? items : [[cat, items]];
        }
        return acc;
      }, {});
      renderMenu();
    })
    .catch(err => console.error('加载菜单失败:', err));

  // ==================== 页脚部分 ====================
  const footerHTML = `
    <hr class="divider" />
    <footer class="site-footer">
      本站工具仅供学习与个人使用，内容生成后请自行核对准确性。<br>
      版权所有 © 2025 bb1026 | 由 
      <a href="https://chat.openai.com/" target="_blank">ChatGPT</a> 和 
      <a href="https://www.deepseek.com/" target="_blank">DeepSeek</a> 生成并优化。<br><br>
      <a href="/pages/about.html" class="footer-link">关于本站</a> | 
      <a href="/pages/about.html" class="footer-link">联系我们</a> | 
      <a href="/pages/about.html" class="footer-link">使用条款</a>
    </footer>

    <div style="display: flex; justify-content: center; align-items: center; height: 30px; font-size: 14px; color: #666; margin-top: 20px;">
  访问量：<span id="busuanzi_value_site_pv">加载中...</span> 次
</div>
  `;

  const footerContainer = document.createElement('div');
  footerContainer.innerHTML = footerHTML;
  document.body.appendChild(footerContainer);

  const busuanziScript = document.createElement('script');
  busuanziScript.defer = true;
  busuanziScript.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
  document.body.appendChild(busuanziScript);

  // ==================== 共用函数 ====================
  function debounce(func, wait) {
    let timeout;
    return function() {
      clearTimeout(timeout);
      timeout = setTimeout(func, wait);
    };
  }
});
