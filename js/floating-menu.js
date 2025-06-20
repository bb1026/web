document.addEventListener('DOMContentLoaded', async () => {
    // 创建菜单结构
    const menuContainer = document.getElementById('fm-container');
    menuContainer.innerHTML = `
        <div id="fm-toggle">
            <div class="fm-hamburger"></div>
        </div>
        <div id="fm-content">
            <div id="fm-menu-items"></div>
            <div class="fm-search-container" style="position:relative">
                <input type="text" id="fm-search" placeholder="搜索..." inputmode="search">
                <div id="fm-search-suggestions"></div>
            </div>
        </div>
    `;

    // 获取DOM元素
    const menu = document.getElementById('fm-container');
    const toggle = document.getElementById('fm-toggle');
    const menuItemsContainer = document.getElementById('fm-menu-items');
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
        -webkit-overflow-scrolling: touch;
    `;

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

    // 加载菜单数据
    const loadMenuData = async () => {
        try {
            const response = await fetch('https://www.0515364.xyz/json/menu.json');
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
                    ["VBA 代码混淆器 / 还原器", "https://bing.0515364.xyz/vba.html"],
                    ["时间戳工具", "https://bing.0515364.xyz/timestamp.html"],
                    ["编码解码", "https://bing.0515364.xyz/encoder.html"]
                ],
                "色彩查询": "pages/color.html",
                "关于": "pages/about.html"
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
            
            const handleClick = (e) => {
                e.stopPropagation();
                menuSearch.value = name;
                suggestionsContainer.style.display = 'none';
                menuSearch.focus();
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

		// 显示搜索结果
		// 显示搜索结果
const showSearchResults = (items) => {
    suggestionsContainer.style.display = 'none';
    menu.classList.remove('fm-active');
    isOpen = false;
    menuSearch.value = '';
    
    // 清除旧的搜索结果覆盖层（如果存在）
    const oldOverlay = document.getElementById('search-results-overlay');
    if (oldOverlay) {
        document.body.removeChild(oldOverlay);
    }
    
    // 创建新的覆盖层（包含结果和页脚）
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
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `;
    
    // 结果容器（可滚动，顶部留出空间）
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        margin-top: 70px;
        -webkit-overflow-scrolling: touch;
    `;
    
    // 内容容器
    const resultsContainer = document.createElement('div');
    resultsContainer.style.cssText = `
        max-width: 800px;
        margin: 0 auto;
        padding-bottom: 20px;
    `;
    
    // 获取原始页脚
    const originalFooter = document.querySelector('.site-footer');
    
    // 创建页脚容器
    const footerContainer = document.createElement('div');
    footerContainer.className = 'site-footer';
    footerContainer.style.cssText = `
        flex-shrink: 0;
        background: white;
        padding: 15px 0;
        border-top: 1px solid #eee;
    `;
    
    // 1. 先克隆原始HTML结构
    footerContainer.innerHTML = originalFooter.innerHTML;
    
    // 2. 动态加载footer.js（确保统计脚本运行）
    const footerScript = document.createElement('script');
    footerScript.src = 'https://www.0515364.xyz/js/footer.js';
    
    // 填充内容
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
    
    // 关闭按钮
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
    `;
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.querySelector('.content').style.display = 'block';
        document.querySelector('.site-footer').style.display = 'block';
    });
    
    // 组装元素
    resultsContainer.appendChild(closeBtn);
    scrollContainer.appendChild(resultsContainer);
    overlay.appendChild(scrollContainer);
    overlay.appendChild(footerContainer);
    overlay.appendChild(footerScript); // 添加脚本
    
    // 隐藏原始内容
    document.querySelector('.content').style.display = 'none';
    document.querySelector('.site-footer').style.display = 'none';
    document.body.appendChild(overlay);
};

    // 搜索功能实现
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

    menuSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const keyword = this.value.trim();
            if (!keyword) return;
            
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
            showSearchResults(matchedItems);
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

    // 菜单交互
    const toggleMenu = (e) => {
        if (e) e.stopPropagation();
        resetIdleTimer();
        isOpen = !isOpen;
        menu.classList.toggle('fm-active', isOpen);
        if (!isOpen) {
            closeAllSubmenus();
            menuSearch.blur();
            suggestionsContainer.style.display = 'none';
        }
    };
    
    toggle.addEventListener('click', toggleMenu);
    toggle.addEventListener('touchend', toggleMenu, {passive: true});
    
    // 分级关闭菜单
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