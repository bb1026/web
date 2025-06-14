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

// ======= 动态计算 margin-top =======
let lastViewportHeight = window.innerHeight;

function adjustMainContentMargin() {
  const topNav = document.getElementById('topNav');
  const mainContent = document.getElementById('mainContent');
  if (topNav && mainContent) {
    // 添加防抖检测地址栏变化
    const currentHeight = window.innerHeight;
    const heightDiff = Math.abs(currentHeight - lastViewportHeight);
    
    // 当高度变化超过50px（典型地址栏高度）时才更新
    if (heightDiff > 50 || heightDiff === 0) {
      mainContent.style.marginTop = `${topNav.offsetHeight + 20}px`;
      lastViewportHeight = currentHeight;
    }
  }
}

// 使用 visualViewport API 优先（如果可用）
if ('visualViewport' in window) {
  window.visualViewport.addEventListener('resize', adjustMainContentMargin);
} else {
  // 传统浏览器降级方案
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(adjustMainContentMargin, 100);
  });
}

// 保持原有初始化逻辑
document.addEventListener('DOMContentLoaded', adjustMainContentMargin);

// 保持原有的 MutationObserver
if (document.getElementById('topNav')) {
  new MutationObserver(adjustMainContentMargin).observe(
    document.getElementById('topNav'),
    { childList: true, subtree: true, attributes: true }
  );
}