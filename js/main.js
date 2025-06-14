let allData = {};
const maxDisplay = 6;

function renderMenu(filtered = null) {
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';
  const categories = filtered || allData;
  
  if (filtered && Object.keys(filtered).length === 0) {
    container.innerHTML = '<div class="no-results">未找到匹配的工具</div>';
    return;
  }

  Object.entries(categories).forEach(([cat, tools]) => {
    if (!tools || tools.length === 0) return;

    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `<h2>${cat}</h2>`;
    let toolList = document.createElement('div'); // 使用let以便更新引用
    toolList.className = 'tool-list';

    const normalizedTools = Array.isArray(tools[0]) ? tools : [[cat, tools]];
    const itemsToShow = filtered ? normalizedTools : normalizedTools.slice(0, maxDisplay);
    
    itemsToShow.forEach(([name, href]) => {
      const a = document.createElement('a');
      a.className = 'tool-item';
      a.href = href;
      a.appendChild(document.createTextNode(name));
      toolList.appendChild(a);
    });

    section.appendChild(toolList);

    if (!filtered && normalizedTools.length > maxDisplay) {
      let expanded = false;
      const more = document.createElement('button'); // 改为button避免href="#"
      more.className = 'more-link';
      more.textContent = '展开...';
      
      // 修改后的展开/收起逻辑
more.onclick = (e) => {
  e.preventDefault();
  expanded = !expanded;

  // 创建新列表时保留原样式和类
  const newList = toolList.cloneNode(false); // 复制原列表容器
  newList.innerHTML = ''; // 清空内容
  
  const visible = expanded ? normalizedTools : normalizedTools.slice(0, maxDisplay);
  
  visible.forEach(([name, href]) => {
    const a = document.createElement('a');
    a.className = 'tool-item';
    a.href = href;
    a.textContent = name;
    newList.appendChild(a);
  });

  // 平滑替换（保留布局上下文）
  toolList.parentNode.insertBefore(newList, toolList);
  toolList.remove();
  toolList = newList; // 更新引用

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