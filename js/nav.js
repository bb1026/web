if (window.navInitialized) return;
window.navInitialized = true;
fetch('menu.json')
  .then(res => res.json())
  .then(menu => {
    const navList = document.getElementById('navList');

    // 添加首页
    const homeLi = document.createElement('li');
    const homeLink = document.createElement('a');
    homeLink.href = "#"; // 使用 # 防止跳转页面
    homeLink.textContent = "首页";
    
    // 点击首页时显示 banner 和菜单，隐藏 iframe
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
        for (const [name, href] of menu[category]) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = href;
  link.target = 'mainFrame';
  link.textContent = name;

  // 点击子菜单时显示 iframe，隐藏主页内容
  link.onclick = () => {
          document.getElementById('mainFrame').style.display = 'block';
          document.getElementById('banner').style.display = 'none';
          document.getElementById('menuContainer').style.display = 'none';
          window.scrollTo(0, 0);
        };
      
        item.appendChild(link);
        submenu.appendChild(item);
    }
        submenu.appendChild(item);
      }

      dropdown.appendChild(submenu);
      navList.appendChild(dropdown);

      // 点击分类标题展开/收起子菜单
            toggleSpan.addEventListener('click', () => {
        // 先关闭所有 submenu
        document.querySelectorAll('#topNav .submenu').forEach(s => {
          if (s !== submenu) s.classList.remove('visible');
        });
      
        // 切换当前 submenu
        submenu.classList.toggle('visible');
      });
    }
  });