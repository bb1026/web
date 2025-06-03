// js/nav.js
fetch('../menu.json')
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
      dropdown.innerHTML = `<span>${category}</span>`;

      const submenu = document.createElement('ul');
      submenu.className = 'submenu';

      for (const [name, href] of menu[category]) {
        const item = document.createElement('li');
        item.innerHTML = `<a href="${href}" target="mainFrame">${name}</a>`;
        submenu.appendChild(item);
      }

      dropdown.appendChild(submenu);
      navList.appendChild(dropdown);
    }
  });
