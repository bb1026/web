// 加载菜单 JSON 并构建导航栏
fetch('menu.json')
  .then(res => res.json())
  .then(menu => {
    const navList = document.getElementById('navList');

    // 添加首页链接
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

    // 添加分类及子项
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
          // 显示 iframe，隐藏 banner 和菜单
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

      // 分类点击展开/收起
      toggleSpan.addEventListener('click', () => {
        document.querySelectorAll('#topNav .submenu').forEach(s => {
          if (s !== submenu) s.classList.remove('visible');
        });
        submenu.classList.toggle('visible');
      });
    }
  });