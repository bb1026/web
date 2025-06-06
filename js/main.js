let allData = {};

function renderMenu(filtered = null) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';
  const categories = filtered || allData;
  Object.entries(categories).forEach(([cat, tools]) => {
    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `<h2>${cat}</h2>`;
    const toolList = document.createElement('div');
    toolList.className = 'tool-list';

    const limited = tools.slice(0, 3);
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

    if (tools.length > 3) {
      const more = document.createElement('a');
      more.className = 'more-link';
      more.href = '#';
      more.textContent = '查看更多...';
      more.onclick = (e) => {
        e.preventDefault();
        toolList.innerHTML = '';
        tools.forEach(([name, href]) => {
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
        more.remove();
      };
      section.appendChild(more);
    }

    container.appendChild(section);
  });
}

// 加载 menu.json 并渲染菜单
fetch('menu.json')
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