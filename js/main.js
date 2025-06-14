let allData = {};
const maxDisplay = 6;

function renderMenu(filtered = null) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';
  const categories = filtered || allData;
  Object.entries(categories).forEach(([cat, tools]) => {
    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `<h2>${cat}</h2>`;
    let toolList = document.createElement('div');
    toolList.className = 'tool-list';

    const limited = tools.slice(0, maxDisplay); // 显示数量
    limited.forEach(([name, href]) => {
      const a = document.createElement('a');
      a.className = 'tool-item';
      a.href = href;
      a.target = 'mainFrame';
      a.textContent = name;
      a.onclick = () => {
  document.getElementById('mainFrame').style.display = 'block';
  document.getElementById('banner').style.display = 'none';
  document.getElementById('menuContainer').style.display = 'none';
  window.scrollTo(0, 0);
};
      toolList.appendChild(a);
    });

    section.appendChild(toolList);

    if (tools.length > maxDisplay) {
      let expanded = false;
    
      const more = document.createElement('a');
      more.className = 'more-link';
      more.href = '#';
      more.textContent = '查看更多工具 ⇩';
    
      more.onclick = (e) => {
        e.preventDefault();
        expanded = !expanded;
    
        const newList = document.createElement('div');
        newList.className = 'tool-list';
        const visible = expanded ? tools : tools.slice(0, maxDisplay);
    
        visible.forEach(([name, href]) => {
          const a = document.createElement('a');
          a.className = 'tool-item';
          a.href = href;
          a.target = 'mainFrame';
          a.textContent = name;
          a.onclick = () => {
            document.getElementById('mainFrame').style.display = 'block';
            document.getElementById('banner').style.display = 'none';
            document.getElementById('menuContainer').style.display = 'none';
            window.scrollTo(0, 0);
          };
          newList.appendChild(a);
        });
    
        toolList.replaceWith(newList);
        toolList = newList;
    
        more.textContent = expanded ? '收起工具 ⇧' : '查看更多工具 ⇩';
      };
    
      section.appendChild(more);
    }

    container.appendChild(section);
  });
}

// 加载 menu.json 并渲染菜单
fetch('json/menu.json')
  .then(response => response.json())
  .then(data => {
    allData = data;
    renderMenu();
  });

// 搜索功能
document.getElementById('searchInput').addEventListener('input', function () {
  const keyword = this.value.trim().toLowerCase();

  // 始终显示菜单，隐藏 iframe
  document.getElementById('mainFrame').style.display = 'none';
  document.getElementById('banner').style.display = '';
  document.getElementById('menuContainer').style.display = '';
  window.scrollTo(0, 0);

  if (!keyword) {
    renderMenu();
    return;
  }

  const result = {};
  for (const [cat, tools] of Object.entries(allData)) {
    const match = tools.filter(([name]) => name.toLowerCase().includes(keyword));
    if (match.length > 0) result[cat] = match;
  }
  renderMenu(result);
});

// 在js/main.js中添加
window.addEventListener('scroll', function() {
  const nav = document.getElementById('topNav');
  if (window.scrollY > 10) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});
