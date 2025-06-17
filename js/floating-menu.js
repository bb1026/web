document.addEventListener('DOMContentLoaded', async () => {
    // 创建菜单结构
    const menuContainer = document.getElementById('fm-container');
    menuContainer.innerHTML = `
        <div id="fm-toggle">
            <div class="fm-hamburger"></div>
        </div>
        <div id="fm-content">
            <div class="fm-item fm-home">首页</div>
            <div id="fm-menu-items"></div>
            <div class="fm-item fm-about">关于</div>
            <div class="fm-search-container" style="position:relative">
                <input type="text" id="fm-search" placeholder="搜索...">
                <div id="fm-search-suggestions"></div>
            </div>
        </div>
    `;

    // 获取DOM元素
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
        left: 0;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background: white;
        border: 1px solid #eee;
        border-radius: 0 0 4px 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 1000;
        font-size: 0.8em;
        color: #666;
    `;

    // 状态管理
    let isOpen = false;
    let activeSubmenu = null;
    let idleTimer;
    const IDLE_TIMEOUT = 3000;
    let initialized = false;
    let allMenuData = {};
    let searchTimeout;

    // 初始化空闲计时器
    const initializeTimer = () => {
        if (!initialized) {
            initialized = true;
            idleTimer = setTimeout(() => {
                if (!isOpen) menu.classList.add('fm-idle');
            }, IDLE_TIMEOUT);
        }
    };

    // 重置空闲计时器
    const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        menu.classList.remove('fm-idle');
        idleTimer = setTimeout(() => {
            if (!isOpen) menu.classList.add('fm-idle');
        }, IDLE_TIMEOUT);
    };

    // 关闭所有二级菜单
    const closeAllSubmenus = () => {
        if (activeSubmenu) {
            activeSubmenu.classList.remove('show');
            activeSubmenu.previousElementSibling.classList.remove('open');
            activeSubmenu = null;
        }
    };

    // 加载菜单数据
    const loadMenuData = async () => {
        try {
            const response = await fetch('https://www.0515364.xyz/json/menu.json');
            if (!response.ok) throw new Error('网络响应不正常');
            const data = await response.json();
            
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

    // 渲染菜单项
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

    // 模糊搜索函数
    const fuzzySearch = (items, keyword) => {
        if (!keyword) return [];
        const lowerKeyword = keyword.toLowerCase();
        return items.filter(([name]) => name.toLowerCase().includes(lowerKeyword));
    };

    // 显示搜索建议
    const showSuggestions = (items) => {
        suggestionsContainer.innerHTML = '';
        
        if (items.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'fm-suggestion-item';
            noResult.textContent = '无匹配结果';
            noResult.style.cssText = `
                padding: 8px 12px;
                color: #999;
            `;
            suggestionsContainer.appendChild(noResult);
            return;
        }
        
        items.slice(0, 5).forEach(([name]) => {
            const item = document.createElement('div');
            item.className = 'fm-suggestion-item';
            item.textContent = name;
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                transition: background 0.2s;
                color: #666;
            `;
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'white';
            });
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                menuSearch.value = name;
                suggestionsContainer.style.display = 'none';
            });
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.style.display = 'block';
    };

    // 显示搜索结果（覆盖页面内容）
    const showSearchResults = (items) => {
        // 隐藏菜单和搜索建议
        suggestionsContainer.style.display = 'none';
        menu.classList.remove('fm-active');
        isOpen = false;
        
        // 清空搜索框
        menuSearch.value = '';
        
        // 创建覆盖层
        const overlay = document.createElement('div');
        overlay.id = 'search-results-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 999;
            overflow-y: auto;
            padding: 20px;
        `;
        
        // 创建结果容器
        const resultsContainer = document.createElement('div');
        resultsContainer.style.cssText = `
            max-width: 800px;
            margin: 20px auto;
            padding-bottom: 60px; /* 为关闭按钮留出空间 */
        `;
        
        if (items.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h3 style="color: #666;">没有找到匹配的结果</h3>
                    <p style="color: #999;">请尝试其他关键词</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <h3 style="color: #444; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    搜索结果 (${items.length})
                </h3>
                <div style="display: grid; grid-gap: 10px;">
            `;
            
            items.forEach(([name, url]) => {
                resultsContainer.innerHTML += `
                    <a href="${url}" style="display: block; padding: 12px; border: 1px solid #eee; border-radius: 4px; color: #333; text-decoration: none;">
                        ${name}
                    </a>
                `;
            });
            
            resultsContainer.innerHTML += `</div>`;
        }
        
        // 创建关闭按钮（放在结果下方）
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭搜索结果';
        closeBtn.style.cssText = `
            display: block;
            margin: 30px auto 0;
            background: #6e8efb;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 1em;
        `;
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        resultsContainer.appendChild(closeBtn);
        overlay.appendChild(resultsContainer);
        document.body.appendChild(overlay);
        
        // 滚动到顶部
        window.scrollTo(0, 0);
    };

    // 搜索功能实现
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
            
            const allItems = Object.values(allMenuData).flat();
            const matchedItems = fuzzySearch(allItems, keyword);
            showSearchResults(matchedItems);
        }
    });

    // 点击外部关闭建议框
    document.addEventListener('click', (e) => {
        if (!menuSearch.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // 菜单交互
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