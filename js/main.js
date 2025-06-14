let allData = {};
const maxDisplay = 6;

function renderMenu(filtered = null) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';
  const categories = filtered || allData;
  
  Object.entries(categories).forEach(([cat, tools]) => {
    // 跳过空分类
    if (!tools || tools.length === 0) return;

    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `<h2>${cat}</h2>`;
    let toolList = document.createElement('div');
    toolList.className = 'tool-list';

    // 处理单项目直接链接的情况（如 "色彩查询": "pages/color.html"）
    const normalizedTools = Array.isArray(tools[0]) ? tools : [[cat, tools]];
    
    const limited = normalizedTools.slice(0, maxDisplay);
    limited.forEach(([name, href]) => {
      const a = document.createElement('a');
      a.className = 'tool-item';
      a.href = href;
      a.textContent = name;
      toolList.appendChild(a);
    });

    section.appendChild(toolList);

    // 显示"更多/收起"按钮
    if (normalizedTools.length > maxDisplay) {
      let expanded = false;
      const more = document.createElement('a');
      more.className = 'more-link';
      more.href = '#';
      
      more.onclick = (e) => {
        e.preventDefault();
        expanded = !expanded;
        
        const newList = document.createElement('div');
        newList.className = 'tool-list';
        const visible = expanded ? normalizedTools : normalizedTools.slice(0, maxDisplay);
        
        visible.forEach(([name, href]) => {
          const a = document.createElement('a');
          a.className = 'tool-item';
          a.href = href;
          a.textContent = name;
          newList.appendChild(a);
        });
        
        toolList.replaceWith(newList);
        toolList = newList;
        more.textContent = expanded ? '收起...' : '展开...';
      };
      
      section.appendChild(more);
    }

    container.appendChild(section);
  });
}

// 加载并渲染菜单
fetch('json/menu.json')
  .then(response => response.json())
  .then(data => {
    // 标准化数据格式：确保所有值都是数组
    allData = Object.entries(data).reduce((acc, [cat, items]) => {
      acc[cat] = Array.isArray(items) ? items : [[cat, items]];
      return acc;
    }, {});
    renderMenu();
  })
  .catch(err => console.error('加载菜单失败:', err));

// 搜索功能
document.getElementById('searchInput')?.addEventListener('input', function() {
  const keyword = this.value.trim().toLowerCase();
  
  if (!keyword) {
    renderMenu();
    return;
  }

  const result = {};
  for (const [cat, tools] of Object.entries(allData)) {
    const match = tools.filter(([name]) => 
      name.toLowerCase().includes(keyword)
    );
    if (match.length > 0) {
      // 高亮匹配关键词
      result[cat] = match.map(([name, href]) => [
        name.replace(
          new RegExp(keyword, 'gi'), 
          match => `<span class="highlight">${match}</span>`
        ),
        href
      ]);
    }
  }
  
  renderMenu(Object.keys(result).length > 0 ? result : null);
  
  // 无结果提示
  if (Object.keys(result).length === 0) {
    const container = document.getElementById('menuContainer');
    container.innerHTML = `<div class="no-results">未找到匹配的工具</div>`;
  }
});

// 滚动时导航栏样式变化
window.addEventListener('scroll', function() {
  const nav = document.getElementById('topNav');
  nav?.classList.toggle('scrolled', window.scrollY > 10);
});