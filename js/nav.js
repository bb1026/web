fetch('menu.json')
  .then(res => res.json())
  .then(menu => {
    const navList = document.getElementById('navList');

    // 添加首页
    const homeLi = document.createElement('li');
    homeLi.innerHTML = `<a href="index.html" target="_self">首页</a>`;
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
        item.innerHTML = `<a href="${href}" target="mainFrame">${name}</a>`;
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