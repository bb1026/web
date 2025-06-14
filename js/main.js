let allData = {};
const maxDisplay = 6;

function renderMenu(filtered = null) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';
  const categories = filtered || allData;
  
  // 无结果提示
  if (filtered && Object.keys(filtered).length === 0) {
    container.innerHTML = '<div class="no-results">未找到匹配的工具</div>';
    return;
  }

  Object.entries(categories).forEach(([cat, tools]) => {
    if (!tools || tools.length === 0) return;

    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `<h2>${cat}</h2>`;
    const toolList = document.createElement('div');
    toolList.className = 'tool-list';

    // 处理单项目直接链接的情况
    const normalizedTools = Array.isArray(tools[0]) ? tools : [[cat, tools]];
    
    // 搜索时显示所有匹配项，否则显示有限数量
    const itemsToShow = filtered ? normalizedTools : normalizedTools.slice(0, maxDisplay);
    
    itemsToShow.forEach(([name, href]) => {
      const a = document.createElement('a');
      a.className = 'tool-item';
      a.href = href;
      
      // 创建包含原始文本的文本节点，避免HTML被转义
      a.appendChild(document.createTextNode(name));
      
      toolList.appendChild(a);
    });

    section.appendChild(toolList);

    // 非搜索状态下显示"更多/收起"按钮
    if (!filtered && normalizedTools.length > maxDisplay) {
      let expanded = false;
      const more = document.createElement('a');
      more.className = 'more-link';
      more.href = '#';
      more.textContent = '展开...';
      
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
          a.appendChild(document.createTextNode(name));
          newList.appendChild(a);
        });
        
        toolList.replaceWith(newList);
        more.textContent = expanded ? '收起...' : '展开...';
      };
      
      section.appendChild(more);
    }

    container.appendChild(section);
  });
}

// 高亮搜索关键词的函数
function highlightText(node, keyword) {
  const text = node.textContent;
  if (!keyword || !text.toLowerCase().includes(keyword.toLowerCase())) {
    return;
  }

  const regex = new RegExp(keyword, 'gi');
  const newText = text.replace(regex, match => 
    `<span class="highlight">${match}</span>`
  );
  
  const temp = document.createElement('div');
  temp.innerHTML = newText;
  
  // 替换原始节点
  while (temp.firstChild) {
    node.parentNode.insertBefore(temp.firstChild, node);
  }
  node.parentNode.removeChild(node);
}

// 加载并渲染菜单
fetch('json/menu.json')
  .then(response => response.json())
  .then(data => {
    // 标准化数据格式
    allData = Object.entries(data).reduce((acc, [cat, items]) => {
      acc[cat] = Array.isArray(items) ? items : [[cat, items]];
      return acc;
    }, {});
    renderMenu();
  })
  .catch(err => console.error('加载菜单失败:', err));

// 搜索功能
document.getElementById('searchInput')?.addEventListener('input', function() {
  const keyword = this.value.trim();
  
  if (!keyword) {
    renderMenu();
    return;
  }

  const result = {};
  for (const [cat, tools] of Object.entries(allData)) {
    const match = tools.filter(([name]) => 
      name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (match.length > 0) {
      result[cat] = match;
    }
  }
  
  renderMenu(result);
  
  // 对可见文本进行高亮处理
  if (keyword) {
    document.querySelectorAll('.tool-item').forEach(item => {
      highlightText(item.firstChild, keyword); // item.firstChild是文本节点
    });
  }
});

// 滚动时导航栏样式变化
window.addEventListener('scroll', function() {
  const nav = document.getElementById('topNav');
  nav?.classList.toggle('scrolled', window.scrollY > 10);
});