document.addEventListener('DOMContentLoaded', function() {
            // 当前颜色值 (HSV格式)
            let currentColor = {
                h: 0,
                s: 0,
                v: 100
            };
            
            // DOM元素
            const hueSlider = document.getElementById('hueSlider');
            const hueThumb = document.getElementById('hueThumb');
            const colorPanel = document.getElementById('colorPanel');
            const panelThumb = document.getElementById('panelThumb');
            const colorDisplay = document.getElementById('colorDisplay');
            const rInput = document.getElementById('rInput');
            const gInput = document.getElementById('gInput');
            const bInput = document.getElementById('bInput');
            const cInput = document.getElementById('cInput');
            const mInput = document.getElementById('mInput');
            const yInput = document.getElementById('yInput');
            const kInput = document.getElementById('kInput');
            const hInput = document.getElementById('hInput');
            const sInput = document.getElementById('sInput');
            const vInput = document.getElementById('vInput');
            const imageUpload = document.getElementById('imageUpload');
            const fileInput = document.getElementById('fileInput');
            const imagePreview = document.getElementById('imagePreview');
            const previewImage = document.getElementById('previewImage');
            const closeImage = document.getElementById('closeImage');
            
            // 初始化色条和颜色面板
            initColorPicker();
            
            // 初始化传图识色功能
            initImageColorPicker();
            
            // 初始化输入框事件
            initInputEvents();
            
            // 更新颜色显示
            updateColorDisplay();
            
            function initColorPicker() {
                // 色条事件 - 滑动选取
                let isHueDragging = false;
                
                hueSlider.addEventListener('mousedown', function(e) {
                    isHueDragging = true;
                    moveHueThumb(e);
                    e.preventDefault(); // 防止拖动时选中文本
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (isHueDragging) {
                        moveHueThumb(e);
                        e.preventDefault(); // 防止拖动时选中文本
                    }
                });
                
                document.addEventListener('mouseup', function() {
                    isHueDragging = false;
                });
                
                hueSlider.addEventListener('touchstart', function(e) {
                    isHueDragging = true;
                    moveHueThumb(e.touches[0]);
                    e.preventDefault(); // 防止页面滚动
                }, { passive: false });
                
                document.addEventListener('touchmove', function(e) {
                    if (isHueDragging) {
                        moveHueThumb(e.touches[0]);
                        e.preventDefault(); // 防止页面滚动
                    }
                }, { passive: false });
                
                document.addEventListener('touchend', function() {
                    isHueDragging = false;
                });
                
                // 颜色面板事件 - 滑动选取
                let isPanelDragging = false;
                
                colorPanel.addEventListener('mousedown', function(e) {
                    isPanelDragging = true;
                    movePanelThumb(e);
                    e.preventDefault(); // 防止拖动时选中文本
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (isPanelDragging) {
                        movePanelThumb(e);
                        e.preventDefault(); // 防止拖动时选中文本
                    }
                });
                
                document.addEventListener('mouseup', function() {
                    isPanelDragging = false;
                });
                
                colorPanel.addEventListener('touchstart', function(e) {
                    isPanelDragging = true;
                    movePanelThumb(e.touches[0]);
                    e.preventDefault(); // 防止页面滚动
                }, { passive: false });
                
                document.addEventListener('touchmove', function(e) {
                    if (isPanelDragging) {
                        movePanelThumb(e.touches[0]);
                        e.preventDefault(); // 防止页面滚动
                    }
                }, { passive: false });
                
                document.addEventListener('touchend', function() {
                    isPanelDragging = false;
                });
                
                // 设置初始位置
                setHueThumbPosition(0);
                setPanelThumbPosition(1, 0);
            }
            
            function moveHueThumb(e) {
                const rect = hueSlider.getBoundingClientRect();
                let x = e.clientX - rect.left;
                x = Math.max(0, Math.min(x, rect.width));
                const percent = x / rect.width;
                
                setHueThumbPosition(percent);
                
                currentColor.h = Math.round(percent * 360);
                updateColorFromHSV();
                updateColorDisplay();
            }
            
            function setHueThumbPosition(percent) {
                hueThumb.style.left = `${percent * 100}%`;
                
                // 更新颜色面板背景
                const hueColor = hsvToRgb(percent * 360, 100, 100);
                colorPanel.style.background = `linear-gradient(to right, white, rgb(${hueColor.r}, ${hueColor.g}, ${hueColor.b}))`;
            }
            
            function movePanelThumb(e) {
                const rect = colorPanel.getBoundingClientRect();
                let x = e.clientX - rect.left;
                let y = e.clientY - rect.top;
                
                x = Math.max(0, Math.min(x, rect.width));
                y = Math.max(0, Math.min(y, rect.height));
                
                const xPercent = x / rect.width;
                const yPercent = y / rect.height;
                
                setPanelThumbPosition(xPercent, yPercent);
                
                currentColor.s = Math.round(xPercent * 100);
                currentColor.v = Math.round(100 - yPercent * 100);
                updateColorFromHSV();
                updateColorDisplay();
            }
            
            function setPanelThumbPosition(xPercent, yPercent) {
                panelThumb.style.left = `${xPercent * 100}%`;
                panelThumb.style.top = `${yPercent * 100}%`;
            }
            
            function initImageColorPicker() {
                // 点击上传区域
                imageUpload.addEventListener('click', function() {
                    fileInput.click();
                });
                
                // 拖拽上传
                imageUpload.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    imageUpload.style.borderColor = 'var(--primary-color)';
                });
                
                imageUpload.addEventListener('dragleave', function() {
                    imageUpload.style.borderColor = 'var(--border-color)';
                });
                
                imageUpload.addEventListener('drop', function(e) {
                    e.preventDefault();
                    imageUpload.style.borderColor = 'var(--border-color)';
                    
                    if (e.dataTransfer.files.length) {
                        handleImageUpload(e.dataTransfer.files[0]);
                    }
                });
                
                // 文件选择
                fileInput.addEventListener('change', function() {
                    if (fileInput.files.length) {
                        handleImageUpload(fileInput.files[0]);
                    }
                });
                
                // 关闭图片
                closeImage.addEventListener('click', function(e) {
                    e.stopPropagation();
                    imagePreview.style.display = 'none';
                    imageUpload.style.display = 'flex';
                });

                // 图片滑动取色
                let isImageDragging = false;
                
                previewImage.addEventListener('mousedown', function(e) {
                    isImageDragging = true;
                    pickColorFromImage(e);
                    e.preventDefault(); // 防止拖动时选中图片
                });
                
                previewImage.addEventListener('mousemove', function(e) {
                    if (isImageDragging) {
                        pickColorFromImage(e);
                        e.preventDefault(); // 防止拖动时选中图片
                    }
                });
                
                previewImage.addEventListener('mouseup', function() {
                    isImageDragging = false;
                });
                
                previewImage.addEventListener('touchstart', function(e) {
                    isImageDragging = true;
                    pickColorFromImage(e.touches[0]);
                    e.preventDefault(); // 防止页面滚动
                }, { passive: false });
                
                previewImage.addEventListener('touchmove', function(e) {
                    if (isImageDragging) {
                        pickColorFromImage(e.touches[0]);
                        e.preventDefault(); // 防止页面滚动
                    }
                }, { passive: false });
                
                previewImage.addEventListener('touchend', function() {
                    isImageDragging = false;
                });
            }
            
            function pickColorFromImage(e) {
                const rect = previewImage.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = previewImage.naturalWidth;
                canvas.height = previewImage.naturalHeight;
                ctx.drawImage(previewImage, 0, 0, canvas.width, canvas.height);
                
                const pixelX = Math.round(x * (previewImage.naturalWidth / rect.width));
                const pixelY = Math.round(y * (previewImage.naturalHeight / rect.height));
                
                const pixelData = ctx.getImageData(pixelX, pixelY, 1, 1).data;
                
                if (pixelData[3] > 0) {
                    const rgb = {
                        r: pixelData[0],
                        g: pixelData[1],
                        b: pixelData[2]
                    };
                    
                    // 设置当前颜色
                    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                    currentColor = {
                        h: hsv.h,
                        s: hsv.s,
                        v: hsv.v
                    };
                    
                    // 更新UI
                    setHueThumbPosition(hsv.h / 360);
                    setPanelThumbPosition(hsv.s / 100, (100 - hsv.v) / 100);
                    updateColorFromHSV();
                    updateColorDisplay();
                }
            }
            
            function handleImageUpload(file) {
                if (!file.type.match('image.*')) {
                    alert('请选择图片文件');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    imagePreview.style.display = 'block';
                    imageUpload.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
            
            function initInputEvents() {
        // HEX输入
        hexInput.addEventListener('change', function() {
            let hexValue = hexInput.value.trim();
            
            // 确保有#前缀
            if (!hexValue.startsWith('#')) {
                hexValue = '#' + hexValue;
            }
            
            // 验证HEX格式
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexValue)) {
                // 如果是3位HEX，转换为6位
                if (hexValue.length === 4) {
                    hexValue = '#' + hexValue[1] + hexValue[1] + hexValue[2] + hexValue[2] + hexValue[3] + hexValue[3];
                }
                
                const rgb = hexToRgb(hexValue);
                const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                
                currentColor = {
                    h: hsv.h,
                    s: hsv.s,
                    v: hsv.v
                };
                
                setHueThumbPosition(hsv.h / 360);
                setPanelThumbPosition(hsv.s / 100, (100 - hsv.v) / 100);
                updateColorFromHSV();
                updateColorDisplay();
            } else {
                // 如果格式无效，恢复为当前颜色
                updateHexInput();
            }
        });
        
        // HEX输入实时验证
        hexInput.addEventListener('input', function() {
            let hexValue = hexInput.value.trim();
            
            if (hexValue.startsWith('#')) {
                if (hexValue.length > 7) {
                    hexInput.value = hexValue.substring(0, 7);
                }
            } else {
                if (hexValue.length > 6) {
                    hexInput.value = hexValue.substring(0, 6);
                }
            }
            
            // 实时验证并更新（可选）
            if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexValue) || 
                /^[A-Fa-f0-9]{6}$/.test(hexValue) || 
                /^[A-Fa-f0-9]{3}$/.test(hexValue)) {
                hexInput.style.borderColor = '';
            } else {
                hexInput.style.borderColor = 'red';
            }
        });
        
        // RGB输入
        [rInput, gInput, bInput].forEach(input => {
            input.addEventListener('change', function() {
                const r = parseInt(rInput.value) || 0;
                const g = parseInt(gInput.value) || 0;
                const b = parseInt(bInput.value) || 0;
                
                const hsv = rgbToHsv(r, g, b);
                
                currentColor = {
                    h: hsv.h,
                    s: hsv.s,
                    v: hsv.v
                };
                
                setHueThumbPosition(hsv.h / 360);
                setPanelThumbPosition(hsv.s / 100, (100 - hsv.v) / 100);
                updateColorFromHSV();
                updateColorDisplay();
            });
        });
        
        // CMYK输入
        [cInput, mInput, yInput, kInput].forEach(input => {
            input.addEventListener('change', function() {
                const c = parseInt(cInput.value) || 0;
                const m = parseInt(mInput.value) || 0;
                const y = parseInt(yInput.value) || 0;
                const k = parseInt(kInput.value) || 0;
                
                const rgb = cmykToRgb(c, m, y, k);
                const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                
                currentColor = {
                    h: hsv.h,
                    s: hsv.s,
                    v: hsv.v
                };
                
                setHueThumbPosition(hsv.h / 360);
                setPanelThumbPosition(hsv.s / 100, (100 - hsv.v) / 100);
                updateColorFromHSV();
                updateColorDisplay();
            });
        });
        
        // HSV输入
        [hInput, sInput, vInput].forEach(input => {
            input.addEventListener('change', function() {
                const h = parseInt(hInput.value) || 0;
                const s = parseInt(sInput.value) || 0;
                const v = parseInt(vInput.value) || 0;
                
                currentColor = {
                    h: h,
                    s: s,
                    v: v
                };
                
                setHueThumbPosition(h / 360);
                setPanelThumbPosition(s / 100, (100 - v) / 100);
                updateColorFromHSV();
                updateColorDisplay();
            });
        });
    }
    
    function updateColorFromHSV() {
        const rgb = hsvToRgb(currentColor.h, currentColor.s, currentColor.v);
        const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        
        hexInput.value = hex;
        rInput.value = Math.round(rgb.r);
        gInput.value = Math.round(rgb.g);
        bInput.value = Math.round(rgb.b);
        
        cInput.value = Math.round(cmyk.c);
        mInput.value = Math.round(cmyk.m);
        yInput.value = Math.round(cmyk.y);
        kInput.value = Math.round(cmyk.k);
        
        hInput.value = Math.round(currentColor.h);
        sInput.value = Math.round(currentColor.s);
        vInput.value = Math.round(currentColor.v);
    }
    
    function updateHexInput() {
        const rgb = hsvToRgb(currentColor.h, currentColor.s, currentColor.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        hexInput.value = hex;
    }
    
    function updateColorDisplay() {
        const rgb = hsvToRgb(currentColor.h, currentColor.s, currentColor.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        
        colorDisplay.style.backgroundColor = hex;
    }
    
    // 颜色转换函数
    function rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }
    
    function hexToRgb(hex) {
        // 移除#号
        hex = hex.replace(/^#/, '');
        
        // 处理3位HEX
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
            
            function rgbToHsv(r, g, b) {
                r /= 255, g /= 255, b /= 255;
                
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h, s, v = max;
                
                const d = max - min;
                s = max === 0 ? 0 : d / max;
                
                if (max === min) {
                    h = 0; // achromatic
                } else {
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h *= 60;
                }
                
                return {
                    h: Math.round(h),
                    s: Math.round(s * 100),
                    v: Math.round(v * 100)
                };
            }
            
            function hsvToRgb(h, s, v) {
                h = h % 360;
                s /= 100;
                v /= 100;
                
                let r, g, b;
                
                const i = Math.floor(h / 60);
                const f = h / 60 - i;
                const p = v * (1 - s);
                const q = v * (1 - f * s);
                const t = v * (1 - (1 - f) * s);
                
                switch (i % 6) {
                    case 0: r = v, g = t, b = p; break;
                    case 1: r = q, g = v, b = p; break;
                    case 2: r = p, g = v, b = t; break;
                    case 3: r = p, g = q, b = v; break;
                    case 4: r = t, g = p, b = v; break;
                    case 5: r = v, g = p, b = q; break;
                }
                
                return {
                    r: Math.round(r * 255),
                    g: Math.round(g * 255),
                    b: Math.round(b * 255)
                };
            }
            
            function rgbToCmyk(r, g, b) {
                r /= 255;
                g /= 255;
                b /= 255;
                
                const k = 1 - Math.max(r, g, b);
                const c = (1 - r - k) / (1 - k) || 0;
                const m = (1 - g - k) / (1 - k) || 0;
                const y = (1 - b - k) / (1 - k) || 0;
                
                return {
                    c: Math.round(c * 100),
                    m: Math.round(m * 100),
                    y: Math.round(y * 100),
                    k: Math.round(k * 100)
                };
            }
            
            function cmykToRgb(c, m, y, k) {
                c /= 100;
                m /= 100;
                y /= 100;
                k /= 100;
                
                const r = 255 * (1 - c) * (1 - k);
                const g = 255 * (1 - m) * (1 - k);
                const b = 255 * (1 - y) * (1 - k);
                
                return {
                    r: Math.round(r),
                    g: Math.round(g),
                    b: Math.round(b)
                };
            }
        });