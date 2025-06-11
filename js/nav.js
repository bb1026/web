document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.getElementById('mainFrame');
  const banner = document.getElementById('banner');
  const menuContainer = document.getElementById('menuContainer');
  const navList = document.getElementById('navList');
  const menuToggle = document.getElementById('menuToggle');
  const siteLogo = document.getElementById('siteLogo');

  function loadPageIntoFrame(url) {
    iframe.src = 'about:blank';
    iframe.style.display = 'none';
    setTimeout(() => {
      iframe.src = url;
      iframe.style.display = 'block';
    }, 50);
  }

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
    document.querySelectorAll('#navList .submenu.visible').forEach(menu => {
      menu.classList.remove('visible');
    });
  }

  // 加载菜单 JSON
  fetch('json/menu.json')
    .then(res => res.json())
    .then(menu => {
      // 首页按钮
      const homeLi = document.createElement('li');
      const homeLink = document.createElement('a');
      homeLink.href = "#";
      homeLink.textContent = "首页";
      homeLink.onclick = (e) => {
        e.preventDefault();
        showHome();
        navList.classList.add('nav-hidden');
      };
      homeLi.appendChild(homeLink);
      navList.appendChild(homeLi);

      // 分类
      for (const category in menu) {
        const dropdown = document.createElement('li');
        const toggleSpan = document.createElement('span');
        toggleSpan.textContent = category;
        toggleSpan.className = 'dropdown-toggle';
        toggleSpan.style.display = 'block';
        toggleSpan.style.cursor = 'pointer';
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
            navList.classList.add('nav-hidden');
            window.scrollTo(0, 0);
          };
          item.appendChild(link);
          submenu.appendChild(item);
        }

        dropdown.appendChild(submenu);
        navList.appendChild(dropdown);

        toggleSpan.addEventListener('click', () => {
          document.querySelectorAll('#navList .submenu').forEach(s => {
            if (s !== submenu) s.classList.remove('visible');
          });
          submenu.classList.toggle('visible');
        });
      }

      // 关于按钮
      const aboutLi = document.createElement('li');
      const aboutLink = document.createElement('a');
      aboutLink.href = "#";
      aboutLink.textContent = "关于";
      aboutLink.onclick = (e) => {
        e.preventDefault();
        loadPageIntoFrame('pages/about.html');
        banner.style.display = 'none';
        menuContainer.style.display = 'none';
        hideMenus();
        navList.classList.add('nav-hidden');
        window.scrollTo(0, 0);
      };
      aboutLi.appendChild(aboutLink);
      navList.appendChild(aboutLi);
    })
    .catch(err => {
      console.error('加载菜单失败:', err);
    });

  // Footer 链接跳转
  document.querySelectorAll('.footer-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      loadPageIntoFrame('pages/about.html');
      banner.style.display = 'none';
      menuContainer.style.display = 'none';
      hideMenus();
      navList.classList.add('nav-hidden');
      window.scrollTo(0, 0);
    });
  });

  // 点击 logo 回首页
  siteLogo.addEventListener('click', () => {
    showHome();
    navList.classList.add('nav-hidden');
  });

  // 点击汉堡菜单切换显示
  menuToggle.addEventListener('click', () => {
    navList.classList.toggle('nav-hidden');
  });

  // 点击其他区域关闭菜单
  document.addEventListener('click', (e) => {
    if (
      e.target.closest('#topNav') ||
      e.target.id === 'menuToggle'
    ) return;
    navList.classList.add('nav-hidden');
    hideMenus();
  });
});