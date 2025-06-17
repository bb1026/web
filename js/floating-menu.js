document.addEventListener('DOMContentLoaded', async () => {
    // 创建菜单结构（保持不变）
    const menuContainer = document.getElementById('fm-container');
    menuContainer.innerHTML = `
        <div id="fm-toggle">
            <div class="fm-hamburger"></div>
        </div>
        <div id="fm-content">
            <div class="fm-item fm-home">首页</div>
            <div id="fm-menu-items"></div>
            <div class="fm-item fm-about">关于</div>
            <input type="text" id="fm-search" placeholder="搜索...">
            <div id="fm-search-suggestions"></div>
        </div>
    `;

    // 获取DOM元素（保持不变）
    const menu = document.getElementById('fm-container');
    const toggle = document.getElementById('fm-toggle');
    const menuItemsContainer = document.getElementById('fm-menu-items');
    const homeBtn = document.querySelector('.fm-home');
    const aboutBtn = document.querySelector('.fm-about');
    const menuSearch = document.getElementById('fm-search');
    const suggestionsContainer = document.getElementById('fm-search-suggestions');

    // 设置搜索建议框样式
    suggestionsContainer.style.cssText = `
        display: none;
        position: absolute;
        top: 100%;
        left: 30px;
        right: 30px;
        max-height: 300px;
        overflow-y: auto;
        background: white;
        border-radius: 0 0 18px 18px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
    `;

    // 状态管理（保持不变）
    let isOpen = false;
    let activeSubmenu = null;
    let idleTimer;
    const IDLE_TIMEOUT = 3000;
    let initialized = false;
    let allMenuData = {};
    let searchTimeout;

    // 初始化空闲计时器（保持不变）
    const initializeTimer = () => {
        if (!initialized) {
            initialized = true;
            idleTimer = setTimeout(() => {
                if (!isOpen) menu.classList.add('fm-idle');
            }, IDLE_TIMEOUT);
        }
    };

    // 重置空闲计时器（保持不变）
    const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        menu.classList.remove('fm-idle');
        idleTimer = setTimeout(() => {
            if (!isOpen) menu.classList.add('fm-idle');
        }, IDLE_TIMEOUT);
    };

    // 关闭所有二级菜单（保持不变）
    const closeAllSubmenus = () => {
        if (activeSubmenu) {
            activeSubmenu.classList.remove('show');
            activeSubmenu.previousElementSibling.classList.remove('open');
            activeSubmenu = null;
        }
    };

    // 加载菜单数据（保持不变）
    const loadMenuData = async () => {
        try {
            const response = await fetch('https://www.0515364.xyz/json/menu.json');
            if (!response.ok) throw new Error('网络响应不正常');
            const data = await response.json();
            
            // 标准化数据格式
            allMenuData = Object.entries(data).reduce((acc, [cat, items]) => {
                acc[cat] = Array.isArray(items) ? items : [[cat, items]];
                return acc;
            }, {});
            
            return allMenuData;
        } catch (error) {
            console.error('加载菜单失败:', error);
            allMenuData = {
                "产品": [["产品1", "#"], ["产品2", "#"]],
                "服务": [["服务1", "#"], ["服务2", "#"]]
            };
            return allMenuData;
        }
    };

    // 渲染菜单项（保持不变）
    const renderMenuItems = (menuData) => {
        menuItemsContainer.innerHTML = '';
        
        Object.entries(menuData).forEach(([name, items]) => {
            const container = document.createElement('div');
            const header = document.createElement('div');
            header.className = 'fm-item fm-has-submenu';
            header.textContent = name;
            
            const submenu = document.createElement('div');
            submenu.className = 'fm-submenu';
            
            items.forEach(([subName, subUrl]) => {
                const subItem = document.createElement('div');
                subItem.className = 'fm-item';
                subItem.textContent = subName;
                subItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = subUrl;
                });
                submenu.appendChild(subItem);
            });
            
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                resetIdleTimer();
                
                if (activeSubmenu === submenu) {
                    closeAllSubmenus();
                    return;
                }
                
                closeAllSubmenus();
                header.classList.add('open');
                submenu.classList.add('show');
                activeSubmenu = submenu;
            });
            
            container.appendChild(header);
            container.appendChild(submenu);
            menuItemsContainer.appendChild(container);
        });
    };

    // 模糊搜索函数（新增）
    const fuzzySearch = (items, keyword) => {
        if (!keyword) return [];
        const lowerKeyword = keyword.toLowerCase();
        return items.filter(([name]) => name.toLowerCase().includes(lowerKeyword));
    };

    // 显示搜索建议（新增）
    const showSuggestions = (items) => {
        suggestionsContainer.innerHTML = '';
        
        if (items.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'fm-suggestion-item';
            noResult.textContent = '无匹配结果';
            suggestionsContainer.appendChild(noResult);
            return;
        }
        
        items.slice(0, 5).forEach(([name]) => {
            const item = document.createElement('div');
            item.className = 'fm-suggestion-item';
            item.textContent = name;
            item.style.cssText = `
                padding: 10px 20px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'white';
            });
            item.addEventListener('click', () => {
                menuSearch.value = name;
                suggestionsContainer.style.display = 'none';
            });
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.style.display = 'block';
    };

    // 显示搜索结果（新增）
    const showSearchResults = (items) => {
        // 创建结果容器
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'fm-search-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            max-width: 600px;
            max-height: 70vh;
            overflow-y: auto;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            z-index: 1000;
        `;
        
        if (items.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <h3>没有找到匹配的结果</h3>
                    <p>5秒后将返回首页...</p>
                </div>
            `;
            
            setTimeout(() => {
                document.body.removeChild(resultsContainer);
                window.location.href = '/';
            }, 5000);
        } else {
            const resultsList = document.createElement('div');
            items.forEach(([name, url]) => {
                const resultItem = document.createElement('div');
                resultItem.style.cssText = `
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                `;
                resultItem.innerHTML = `<a href="${url}" style="display: block; color: #333; text-decoration: none;">${name}</a>`;
                resultItem.querySelector('a').addEventListener('mouseenter', () => {
                    resultItem.style.background = '#f8f8f8';
                });
                resultItem.querySelector('a').addEventListener('mouseleave', () => {
                    resultItem.style.background = 'white';
                });
                resultsList.appendChild(resultItem);
            });
            resultsContainer.appendChild(resultsList);
        }
        
        document.body.appendChild(resultsContainer);
        
        // 点击外部关闭
        const closeResults = (e) => {
            if (!resultsContainer.contains(e.target)) {
                document.body.removeChild(resultsContainer);
                document.removeEventListener('click', closeResults);
            }
        };
        setTimeout(() => document.addEventListener('click', closeResults), 0);
    };

    // 搜索功能实现（新增）
    menuSearch.addEventListener('input', function() {
        resetIdleTimer();
        clearTimeout(searchTimeout);
        
        const keyword = this.value.trim();
        if (!keyword) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            const allItems = Object.values(allMenuData).flat();
            const matchedItems = fuzzySearch(allItems, keyword);
            showSuggestions(matchedItems);
        }, 300);
    });

    menuSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const keyword = this.value.trim();
            if (!keyword) return;
            
            suggestionsContainer.style.display = 'none';
            const allItems = Object.values(allMenuData).flat();
            const matchedItems = fuzzySearch(allItems, keyword);
            showSearchResults(matchedItems);
        }
    });

    // 点击外部关闭建议框（新增）
    document.addEventListener('click', (e) => {
        if (!menuSearch.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // 原有事件监听（保持不变）
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        resetIdleTimer();
        isOpen = !isOpen;
        menu.classList.toggle('fm-active', isOpen);
        if (!isOpen) closeAllSubmenus();
    });
    
    homeBtn.addEventListener('click', () => {
        resetIdleTimer();
        window.location.href = '/';
    });
    
    aboutBtn.addEventListener('click', () => {
        resetIdleTimer();
        window.location.href = '/about.html';
    });
    
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
            if (activeSubmenu) {
                closeAllSubmenus();
            } else if (isOpen) {
                isOpen = false;
                menu.classList.remove('fm-active');
            }
        }
        resetIdleTimer();
    });
    
    const handleUserActivity = () => {
        resetIdleTimer();
    };
    
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);

    // 初始化菜单
    const menuData = await loadMenuData();
    renderMenuItems(menuData);
    initializeTimer();
});