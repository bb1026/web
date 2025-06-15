document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('banner');
  const menuContainer = document.getElementById('menuContainer');
  
  // 封装导航状态切换
  function showHome() {
  // 只有当前是首页时才执行这些操作
  if (location.pathname === "/") {
    banner.style.display = '';
    menuContainer.style.display = '';
    window.scrollTo(0, 0);
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    if (typeof renderMenu === 'function') renderMenu();
  }
}

  function hideMenus() {
    document.querySelectorAll('#topNav .submenu.visible').forEach(menu => {
      menu.classList.remove('visible');
    });
  }

  // 加载菜单 JSON
  fetch('/json/menu.json')
    .then(res => res.json())
    .then(menuData => {
      const navList = document.getElementById('navList');

      // 首页按钮
          const homeLi = document.createElement('li');
    const homeLink = document.createElement('a');
    homeLink.href = "/";
    homeLink.textContent = "首页";
    homeLink.onclick = (e) => {
      //e.preventDefault();
      history.pushState(null, "", "/");
      showHome();
    };
    homeLi.appendChild(homeLink);
    navList.appendChild(homeLi);
    
    // 添加路由监听
    window.addEventListener('popstate', () => {
      if (location.pathname === "/") {
        showHome();
      }
    });

      // 处理菜单数据
      for (const [category, items] of Object.entries(menuData)) {
        // 如果是字符串，说明是直接链接
        if (typeof items === 'string') {
          const directLi = document.createElement('li');
          const directLink = document.createElement('a');
          directLink.href = items;
          directLink.textContent = category;
          directLi.appendChild(directLink);
          navList.appendChild(directLi);
          continue;
        }

        // 如果是数组且只有1个项目，也作为直接链接处理
        if (items.length === 1) {
          const singleLi = document.createElement('li');
          const singleLink = document.createElement('a');
          singleLink.href = items[0][1];
          singleLink.textContent = category;
          singleLi.appendChild(singleLink);
          navList.appendChild(singleLi);
          continue;
        }

        // 多个项目时创建下拉菜单
        const dropdown = document.createElement('li');
        dropdown.className = 'dropdown';

        const toggleSpan = document.createElement('span');
        toggleSpan.textContent = category;
        toggleSpan.className = 'dropdown-toggle';
        dropdown.appendChild(toggleSpan);

        const submenu = document.createElement('ul');
        submenu.className = 'submenu';

        for (const [name, href] of items) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = href;
          link.textContent = name;
          item.appendChild(link);
          submenu.appendChild(item);
        }

        dropdown.appendChild(submenu);
        navList.appendChild(dropdown);

        // 展开子菜单
        toggleSpan.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll('#topNav .submenu').forEach(s => {
            if (s !== submenu) s.classList.remove('visible');
          });
          submenu.classList.toggle('visible');
        });
      }

      // 关于按钮（直接跳转）
      const aboutLi = document.createElement('li');
      const aboutLink = document.createElement('a');
      aboutLink.href = "/pages/about.html";
      aboutLink.textContent = "关于";
      aboutLi.appendChild(aboutLink);
      navList.appendChild(aboutLi);
    })
    .catch(err => {
      console.error('加载菜单失败:', err);
    });

  // 页脚链接事件（直接跳转）
  document.querySelectorAll('.footer-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      window.location.href = '/pages/about.html';
    });
  });

  // 页面其他区域点击时收起所有子菜单
  document.addEventListener('click', (e) => {
    if (
      e.target.closest('#topNav .dropdown') ||
      e.target.classList.contains('dropdown-toggle')
    ) return;
    hideMenus();
  });
});

// 自动调整菜单与下方距离
function updateContentSpacing() {
  const topNav = document.getElementById('topNav');
  const mainContent = document.getElementById('mainContent');
  
  if (topNav && mainContent) {
    // 1. 获取菜单栏底部文档流绝对位置（非视口相对位置）
    const navHeight = topNav.offsetHeight;
    const navTop = topNav.offsetTop; // 相对于文档顶部的位置
    
    // 2. 设置正文的起始位置（菜单栏底部 + 20px）
    mainContent.style.position = 'static'; // 确保在文档流中
    mainContent.style.marginTop = `${navHeight + 20}px`;
    
    // 3. 同步更新padding确保滚动连续性
    document.body.style.paddingTop = `${navHeight}px`;
  }
}

// 使用现代API监听（性能最佳）
const navObserver = new ResizeObserver(updateContentSpacing);
const mutationObserver = new MutationObserver(updateContentSpacing);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const topNav = document.getElementById('topNav');
  if (topNav) {
    // 双监听模式
    navObserver.observe(topNav);
    mutationObserver.observe(topNav, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // 即时执行 + 滚动时微调
    updateContentSpacing();
    window.addEventListener('scroll', () => {
      requestAnimationFrame(updateContentSpacing);
    });
  }
});
