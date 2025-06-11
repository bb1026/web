document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const topNav = document.getElementById('topNav');
  const iframe = document.getElementById('mainFrame');
  const banner = document.getElementById('banner');
  const menuContainer = document.getElementById('menuContainer');
  const navList = document.getElementById('navList');
  const body = document.body;

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
    body.classList.remove('menu-open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    topNav.classList.remove('visible');
  }

  function hideSubmenus() {
    topNav.querySelectorAll('ul.submenu.visible').forEach(menu => {
      menu.classList.remove('visible');
    });
  }

  hamburgerBtn.addEventListener('click', () => {
    const isVisible = topNav.classList.toggle('visible');
    hamburgerBtn.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
    body.classList.toggle('menu-open', isVisible);
    if (!isVisible) {
      hideSubmenus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#topNav') && e.target !== hamburgerBtn) {
      topNav.classList.remove('visible');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      body.classList.remove('menu-open');
      hideSubmenus();
    }
  });

  fetch('json/menu.json')
    .then(res => res.json())
    .then(menu => {
      navList.innerHTML = '';

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
            topNav.classList.remove('visible');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
            body.classList.remove('menu-open');
            hideSubmenus();
            window.scrollTo(0, 0);
          };

          item.appendChild(link);
          submenu.appendChild(item);
        }

        dropdown.appendChild(submenu);
        navList.appendChild(dropdown);

        toggleSpan.addEventListener('click', () => {
          submenu.classList.toggle('visible');
          topNav.querySelectorAll('ul.submenu').forEach(s => {
            if (s !== submenu) s.classList.remove('visible');
          });
        });
      }

      const aboutLi = document.createElement('li');
      const aboutLink = document.createElement('a');
      aboutLink.href = "#";
      aboutLink.textContent = "关于";
      aboutLink.onclick = (e) => {
        e.preventDefault();
        loadPageIntoFrame('pages/about.html');
        banner.style.display = 'none';
        menuContainer.style.display = 'none';
        topNav.classList.remove('visible');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        body.classList.remove('menu-open');
        hideSubmenus();
        window.scrollTo(0, 0);
      };
      aboutLi.appendChild(aboutLink);
      navList.appendChild(aboutLi);
    })
    .catch(err => {
      console.error('加载菜单失败:', err);
    });

  // 页脚关于链接事件（根据你页面实际情况调整）
  document.querySelectorAll('.footer-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      loadPageIntoFrame('pages/about.html');
      banner.style.display = 'none';
      menuContainer.style.display = 'none';
      topNav.classList.remove('visible');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      body.classList.remove('menu-open');
      hideSubmenus();
      window.scrollTo(0, 0);
    });
  });
});