// 全局状态管理
const appState = {
  currentPath: window.location.pathname,
  isLoading: false,
  menuData: null
};

// DOM 元素缓存
const domElements = {
  banner: document.getElementById('banner'),
  menuContainer: document.getElementById('menuContainer'),
  navList: document.getElementById('navList'),
  mainContent: document.getElementById('mainContent'),
  pageLoader: document.getElementById('pageLoader'),
  searchInput: document.getElementById('searchInput')
};

// 初始化应用
function initApp() {
  setupRouter();
  loadMenuData();
  setupEventListeners();
  adjustMainContentMargin();
}

// 路由系统
function setupRouter() {
  // 初始路由处理
  handleRouteChange();
  
  // 监听浏览器前进/后退
  window.addEventListener('popstate', handleRouteChange);
  
  // 全局链接拦截
  document.addEventListener('click', handleLinkClick);
}

// 路由变化处理
function handleRouteChange() {
  appState.currentPath = window.location.pathname;
  
  // 根据路由显示不同内容
  switch(appState.currentPath) {
    case '/':
      showHomePage();
      break;
    case '/about':
      showAboutPage();
      break;
    // 可以添加更多路由
    default:
      showNotFound();
  }
  
  // 关闭所有打开的菜单
  closeAllSubmenus();
  
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 链接点击处理
function handleLinkClick(event) {
  const link = event.target.closest('a[href^="/"]');
  if (!link || link.hasAttribute('data-external')) return;
  
  event.preventDefault();
  const targetUrl = link.getAttribute('href');
  
  // 如果点击的是当前活动链接，不做处理
  if (targetUrl === appState.currentPath) return;
  
  navigateTo(targetUrl);
}

// 编程式导航
function navigateTo(path) {
  if (appState.isLoading) return;
  
  startLoading();
  
  // 使用 fetch API 获取新内容
  fetch(path, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.text();
  })
  .then(html => {
    updatePageContent(html);
    history.pushState({}, '', path);
    handleRouteChange();
  })
  .catch(error => {
    console.error('Fetch error:', error);
    // 降级方案：传统跳转
    window.location.href = path;
  })
  .finally(() => {
    stopLoading();
  });
}

// 更新页面内容
function updatePageContent(html) {
  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, 'text/html');
  
  // 更新主内容区域
  domElements.mainContent.innerHTML = newDoc.getElementById('mainContent').innerHTML;
  
  // 更新页面标题
  document.title = newDoc.title;
}

// 加载指示器
function startLoading() {
  appState.isLoading = true;
  domElements.pageLoader.style.display = 'block';
  document.body.classList.add('loading');
}

function stopLoading() {
  appState.isLoading = false;
  domElements.pageLoader.style.display = 'none';
  document.body.classList.remove('loading');
}

// 页面控制器
function showHomePage() {
  if (domElements.banner) domElements.banner.style.display = '';
  if (domElements.menuContainer) domElements.menuContainer.style.display = '';
  if (domElements.searchInput) domElements.searchInput.value = '';
}

function showAboutPage() {
  // 可以添加关于页面的特殊处理
}

function showNotFound() {
  domElements.mainContent.innerHTML = `
    <div class="error-page">
      <h1>404 - 页面未找到</h1>
      <p>您访问的页面不存在</p>
      <a href="/">返回首页</a>
    </div>
  `;
}

// 菜单系统
function loadMenuData() {
  fetch('/json/menu.json')
    .then(response => response.json())
    .then(data => {
      appState.menuData = data;
      renderMenu();
    })
    .catch(error => {
      console.error('菜单加载失败:', error);
      renderDefaultMenu();
    });
}

function renderMenu() {
  domElements.navList.innerHTML = '';
  
  // 首页菜单项
  createMenuItem('首页', '/', true);
  
  // 动态生成菜单项
  Object.entries(appState.menuData).forEach(([category, items]) => {
    if (typeof items === 'string') {
      createMenuItem(category, items);
    } else if (items.length === 1) {
      createMenuItem(category, items[0][1]);
    } else {
      createDropdownMenu(category, items);
    }
  });
  
  // 关于菜单项
  createMenuItem('关于', '/about');
}

function createMenuItem(text, href, isHome = false) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (isHome) a.classList.add('home-link');
  li.appendChild(a);
  domElements.navList.appendChild(li);
}

function createDropdownMenu(category, items) {
  const dropdown = document.createElement('li');
  dropdown.className = 'dropdown';
  
  const toggle = document.createElement('span');
  toggle.className = 'dropdown-toggle';
  toggle.textContent = category;
  dropdown.appendChild(toggle);
  
  const submenu = document.createElement('ul');
  submenu.className = 'submenu';
  
  items.forEach(([name, href]) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = href;
    link.textContent = name;
    item.appendChild(link);
    submenu.appendChild(item);
  });
  
  dropdown.appendChild(submenu);
  domElements.navList.appendChild(dropdown);
  
  // 添加下拉菜单交互
  setupDropdownInteraction(dropdown, submenu);
}

function setupDropdownInteraction(dropdown, submenu) {
  dropdown.addEventListener('mouseenter', () => {
    closeAllSubmenus();
    submenu.classList.add('visible');
  });
  
  dropdown.addEventListener('mouseleave', () => {
    submenu.classList.remove('visible');
  });
  
  // 触摸设备支持
  dropdown.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      submenu.classList.toggle('visible');
    }
  });
}

function closeAllSubmenus() {
  document.querySelectorAll('.submenu.visible').forEach(menu => {
    menu.classList.remove('visible');
  });
}

// 响应式布局调整
function adjustMainContentMargin() {
  if (domElements.topNav && domElements.mainContent) {
    domElements.mainContent.style.marginTop = `${domElements.topNav.offsetHeight + 20}px`;
  }
}

// 事件监听器
function setupEventListeners() {
  // 窗口大小变化时调整布局
  window.addEventListener('resize', () => {
    adjustMainContentMargin();
    closeAllSubmenus();
  });
  
  // 点击页面其他区域关闭菜单
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      closeAllSubmenus();
    }
  });
  
  // 观察导航栏变化
  if (domElements.topNav) {
    new MutationObserver(adjustMainContentMargin).observe(
      domElements.topNav,
      { childList: true, subtree: true, attributes: true }
    );
  }
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);