document.addEventListener('DOMContentLoaded', () => {
  // 1. 加载菜单 JSON 并构建导航栏
  fetch('menu.json')
    .then(res => res.json())
    .then(menu => {
      const navList = document.getElementById('navList');

      // 首页
      const homeLi = document.createElement('li');
      const homeLink = document.createElement('a');
      homeLink.href = "#";
      homeLink.textContent = "首页";
      homeLink.onclick = (e) => {
        e.preventDefault();
        document.getElementById('mainFrame').style.display = 'none';
        document.getElementById('banner').style.display = '';
        document.getElementById('menuContainer').style.display = '';
        window.scrollTo(0, 0);
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
          link.target = 'mainFrame';
          link.textContent = name;

          link.onclick = () => {
            document.getElementById('mainFrame').style.display = 'block';
            document.getElementById('banner').style.display = 'none';
            document.getElementById('menuContainer').style.display = 'none';
            document.querySelectorAll('#topNav .submenu.visible').forEach(menu => {
              menu.classList.remove('visible');
            });
            window.scrollTo(0, 0);
          };

          item.appendChild(link);
          submenu.appendChild(item);
        }

        dropdown.appendChild(submenu);
        navList.appendChild(dropdown);

        toggleSpan.addEventListener('click', () => {
          document.querySelectorAll('#topNav .submenu').forEach(s => {
            if (s !== submenu) s.classList.remove('visible');
          });
          submenu.classList.toggle('visible');
        });
      }

      // 关于
      const aboutLi = document.createElement('li');
      const aboutLink = document.createElement('a');
      aboutLink.href = "pages/about.html";
      aboutLink.target = "mainFrame";
      aboutLink.textContent = "关于";

      aboutLink.onclick = (e) => {
        e.preventDefault();
        document.getElementById('mainFrame').style.display = 'block';
        document.getElementById('banner').style.display = 'none';
        document.getElementById('menuContainer').style.display = 'none';
        document.querySelectorAll('#topNav .submenu.visible').forEach(menu => {
          menu.classList.remove('visible');
        });
        window.scrollTo(0, 0);
      };

      aboutLi.appendChild(aboutLink);
      navList.appendChild(aboutLi);
    })
    .catch(err => {
      console.error('加载菜单失败:', err);
    });

  // 2. 绑定页脚链接事件（关于、联系我们、使用条款）
  document.querySelectorAll('.footer-link').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('mainFrame').src = "pages/about.html";
      document.getElementById('mainFrame').style.display = 'block';
      document.getElementById('banner').style.display = 'none';
      document.getElementById('menuContainer').style.display = 'none';
      document.querySelectorAll('#topNav .submenu.visible').forEach(menu => {
        menu.classList.remove('visible');
      });
      window.scrollTo(0, 0);
    });
  });
});

// 页面其他区域点击时收起所有菜单
  document.addEventListener('click', (e) => {
    if (
      e.target.closest('#topNav .dropdown') ||
      e.target.classList.contains('dropdown-toggle')
    ) return;
    document.querySelectorAll('#topNav .submenu.visible').forEach(menu => {
      menu.classList.remove('visible');
    });
  });