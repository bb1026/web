document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.getElementById('mainFrame');
  const banner = document.getElementById('banner');
  const menuContainer = document.getElementById('menuContainer');

  // 封装统一加载函数
  function loadPageIntoFrame(url) {
    iframe.src = 'about:blank';
    iframe.style.display = 'none';

    setTimeout(() => {
      iframe.src = url;
      iframe.style.display = 'block';
    }, 50);
  }

  // 封装导航状态切换
  function showHome() {
    iframe.style.display = 'none';
    banner.style.display = '';
    menuContainer.style.display = '';
    window.scrollTo(0, 0);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    if (typeof renderMenu === 'function') renderMenu();
  }

  function hideMenus() {
    document.querySelectorAll('#topNav .submenu.visible').forEach(menu => {
      menu.classList.remove('visible');
    });
  }

  // 加载菜单 JSON
  fetch('json/menu.json')
    .then(res => res.json())
    .then(menu => {
      const navList = document.getElementById('navList');

      // 首页按钮
      const homeLi = document.createElement('li');
      const homeLink = document.createElement('a');
      homeLink.href = "#";
      homeLink.textContent = "首页";
      homeLink.onclick = (e) => {
        e.preventDefault();
        showHome();
      };
      homeLi.appendChild(homeLink);
      navList.appendChild(homeLi);

      // 分类菜单
      for (const category in menu) {
        const dropdown = document.createElement('li');
        dropdown.className = 'dropdown';

        const toggleSpan = document.createElement('span');
        toggleSpan.textContent = category;
        toggleSpan.className = 'dropdown-toggle';
        dropdown.appendChild(toggleSpan);

        const submenu = document.createElement('ul');
        submenu.className = 'submenu';

        for (const [name, href] of menu[category]) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = href;
          link.textContent = name;

          link.onclick = (e) => {
            e.preventDefault();
            loadPageIntoFrame(href);
            banner.style.display = 'none';
            menuContainer.style.display = 'none';
            hideMenus();
            window.scrollTo(0, 0);
          };

          item.appendChild(link);
          submenu.appendChild(item);
        }

        dropdown.appendChild(submenu);
        navList.appendChild(dropdown);

        // 展开子菜单
        toggleSpan.addEventListener('click', () => {
          document.querySelectorAll('#topNav .submenu').forEach(s => {
            if (s !== submenu) s.classList.remove('visible');
          });
          submenu.classList.toggle('visible');
        });
      }

      // 关于按钮
    const aboutLi = document.createElement('li');
    const aboutLink = document.createElement('a');
    aboutLink.href = "pages/about.html"; // 直接跳转页面
    aboutLink.textContent = "关于";
    aboutLi.appendChild(aboutLink);
    navList.appendChild(aboutLi);

  // 页面其他区域点击时收起所有子菜单
  document.addEventListener('click', (e) => {
    if (
      e.target.closest('#topNav .dropdown') ||
      e.target.classList.contains('dropdown-toggle')
    ) return;
    hideMenus();
  });
});