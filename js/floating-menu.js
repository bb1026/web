document.addEventListener('DOMContentLoaded', async () => {
    // 创建菜单结构，新增.fm-close元素
    const menuContainer = document.getElementById('fm-container');
    menuContainer.innerHTML = `
        <div id="fm-toggle">
            <div class="fm-hamburger"></div>
            <div class="fm-close">X</div> 
        </div>
        <div id="fm-content">
            <div id="fm-menu-items"></div>
            <div class="fm-search-container" style="position:relative">
                <input type="text" id="fm-search" placeholder="搜索..." inputmode="search">
                <div id="fm-search-suggestions"></div>
            </div>
        </div>
    `;
    
    // 获取DOM元素（新增fm-close）
    const menu = document.getElementById('fm-container');
    const toggle = document.getElementById('fm-toggle');
    const menuItemsContainer = document.getElementById('fm-menu-items');
    const menuSearch = document.getElementById('fm-search');
    const suggestionsContainer = document.getElementById('fm-search-suggestions');
    const closeButton = document.querySelector('.fm-close'); // 新增
    
    // 状态管理
    let isOpen = false;
    let activeSubmenu = null;
    let idleTimer;
    const IDLE_TIMEOUT = 3000;
    let initialized = false;
    let allMenuData = {};
    let searchTimeout;
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
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
    
    // 加载菜单数据（仅用于显示搜索建议）
    const loadMenuData = async () => {
        try {
            const response = await fetch(`./json/menu.json?timestamp=${Date.now()}`);
            if (!response.ok) throw new Error('网络响应不正常');
            const data = await response.json();
            
            allMenuData = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string') {
                    allMenuData[key] = value;
                } else if (Array.isArray(value)) {
                    allMenuData[key] = value.map(item => {
                        if (Array.isArray(item) && item.length >= 2) {
                            return [item[0], item[1]];
                        }
                        return [item, '#'];
                    });
                } else {
                    allMenuData[key] = typeof value === 'object' ? '#' : String(value);
                }
            }
            
            return allMenuData;
            
        } catch (error) {
            console.error('加载菜单失败:', error);
            allMenuData = {
                "首页": "/",
                "小工具": [
                    ["VBA 代码混淆器 / 还原器", "/pages/vba.html"],
                    ["时间戳工具", "/pages/timestamp.html"],
                    ["编码解码", "/pages/encoder.html"]
                ],
                "色彩查询": "/pages/color.html",
                "关于": "/pages/about.html"
            };
            return allMenuData;
        }
    };
    
    // 渲染菜单项
    const renderMenuItems = (menuData) => {
        menuItemsContainer.innerHTML = '';
        
        Object.entries(menuData).forEach(([name, items]) => {
            if (typeof items === 'string') {
                const item = document.createElement('div');
                item.className = 'fm-item';
                item.textContent = name;
                
                const handleClick = (e) => {
                    e.stopPropagation();
                    resetIdleTimer();
                    window.location.href = items;
                };
                
                item.addEventListener('click', handleClick);
                item.addEventListener('touchend', handleClick, {passive: true});
                
                menuItemsContainer.appendChild(item);
                return;
            }
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
                
                const handleSubClick = (e) => {
                    e.stopPropagation();
                    window.location.href = subUrl;
                };
                
                subItem.addEventListener('click', handleSubClick);
                subItem.addEventListener('touchend', handleSubClick, {passive: true});
                submenu.appendChild(subItem);
            });
            
            const handleHeaderClick = (e) => {
                e.stopPropagation();
                resetIdleTimer();
                
                if (activeSubmenu === submenu) {
                    submenu.classList.remove('show');
                    header.classList.remove('open');
                    activeSubmenu = null;
                    return;
                }
                
                if (activeSubmenu) {
                    activeSubmenu.classList.remove('show');
                    activeSubmenu.previousElementSibling.classList.remove('open');
                }
                
                header.classList.add('open');
                submenu.classList.add('show');
                activeSubmenu = submenu;
            };
            
            header.addEventListener('click', handleHeaderClick);
            header.addEventListener('touchend', handleHeaderClick, {passive: true});
            
            container.appendChild(header);
            container.appendChild(submenu);
            menuItemsContainer.appendChild(container);
        });
    };
    
    // 简单模糊匹配（仅用于显示搜索建议）
    const fuzzySearch = (items, keyword) => {
        if (!keyword) return [];
        const lowerKeyword = keyword.toLowerCase();
        return items.filter(([name]) => name.toLowerCase().includes(lowerKeyword));
    };
    
    // 显示搜索建议（点击后跳转到search.html）
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
            
            const handleClick = (e) => {
                e.stopPropagation();
                window.location.href = `/search.html?q=${encodeURIComponent(name)}`;
            };
            
            item.addEventListener('click', handleClick);
            item.addEventListener('touchend', handleClick, {passive: true});
            
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'white';
            });
            
            suggestionsContainer.appendChild(item);
        });
        
        suggestionsContainer.style.display = 'block';
    };
    
    // 处理搜索输入
    const handleSearchInput = function() {
        resetIdleTimer();
        clearTimeout(searchTimeout);
        
        const keyword = this.value.trim();
        if (!keyword) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            const allItems = [];
            for (const [name, items] of Object.entries(allMenuData)) {
                if (typeof items === 'string') {
                    allItems.push([name, items]);
                } else {
                    items.forEach(([subName, subUrl]) => {
                        allItems.push([subName, subUrl]);
                    });
                }
            }
            const matchedItems = fuzzySearch(allItems, keyword);
            showSuggestions(matchedItems);
        }, isMobile ? 500 : 300);
    };
    menuSearch.addEventListener('input', handleSearchInput);
    
    // 移动设备上添加额外的触摸事件
    if (isMobile) {
        menuSearch.addEventListener('focus', () => {
            menu.classList.add('fm-active');
            isOpen = true;
        });
    }
    // 处理回车键（跳转到search.html）
    menuSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const keyword = this.value.trim();
            if (!keyword) return;
            
            window.location.href = `/search.html?q=${encodeURIComponent(keyword)}`;
        }
    });
    // 点击外部关闭建议框
    const handleOutsideClick = (e) => {
        if (!menuSearch.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    };
    
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchend', handleOutsideClick, {passive: true});
    
    // 菜单交互（修改按钮显示逻辑，修复事件冒泡）
    const toggleMenu = () => {
        resetIdleTimer();
        isOpen = !isOpen;
        menu.classList.toggle('fm-active', isOpen);
        
        // 切换汉堡菜单和X按钮的显示
        const hamburger = document.querySelector('.fm-hamburger');
        if (isOpen) {
            hamburger.style.display = 'none';
            closeButton.style.display = 'block';
        } else {
            hamburger.style.display = 'block';
            closeButton.style.display = 'none';
            closeAllSubmenus();
            menuSearch.blur();
            suggestionsContainer.style.display = 'none';
        }
    };
    
    // 汉堡菜单点击事件（绑定到toggle容器）
    toggle.addEventListener('click', (e) => {
        if (e.target === toggle || e.target.classList.contains('fm-hamburger')) {
            e.stopPropagation();
            toggleMenu();
        }
    });
    toggle.addEventListener('touchend', (e) => {
        if (e.target === toggle || e.target.classList.contains('fm-hamburger')) {
            e.stopPropagation();
            toggleMenu();
        }
    }, {passive: true});
    
    // X按钮点击事件（单独绑定，阻止冒泡）
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });
    closeButton.addEventListener('touchend', (e) => {
        e.stopPropagation();
        toggleMenu();
    }, {passive: true});
    
    // 关闭菜单逻辑
    const closeMenu = (e) => {
        if (activeSubmenu) {
            const submenuHeader = activeSubmenu.previousElementSibling;
            if (activeSubmenu.contains(e.target) || (submenuHeader && submenuHeader.contains(e.target))) {
                return;
            }
            activeSubmenu.classList.remove('show');
            if (submenuHeader) submenuHeader.classList.remove('open');
            activeSubmenu = null;
            return;
        }
        if (menu.contains(e.target)) return;
        if (isOpen) {
            isOpen = false;
            menu.classList.remove('fm-active');
            closeAllSubmenus();
            menuSearch.blur();
            suggestionsContainer.style.display = 'none';
            
            // 收起时隐藏X按钮，显示汉堡菜单
            const hamburger = document.querySelector('.fm-hamburger');
            hamburger.style.display = 'block';
            closeButton.style.display = 'none';
        }
    };
    
    document.addEventListener('click', closeMenu);
    document.addEventListener('touchend', closeMenu, {passive: true});
    
    // 用户活动监测
    const handleUserActivity = () => {
        resetIdleTimer();
    };
    
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, handleUserActivity);
    });
    
    // 初始化菜单
    const menuData = await loadMenuData();
    renderMenuItems(menuData);
    initializeTimer();
    
    // 移动设备特定优化
    if (isMobile) {
        menuSearch.addEventListener('focus', () => {
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
            }, 100);
        });
        
        const adjustForKeyboard = () => {
            if (document.activeElement === menuSearch) {
                menu.style.top = '10px';
            }
        };
        
        window.addEventListener('resize', adjustForKeyboard);
    }
});
