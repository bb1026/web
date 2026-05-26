// layout.js - 全站自动布局系统

(function () {
  const style = document.createElement("style");
  style.textContent = `
    body {
      margin: 0;
      font-family: Arial, sans-serif;
    }

    /* ===== Header ===== */
    .auto-header {
      position: sticky;
      top: 0;
      z-index: 9999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: var(--bg, #fff);
      border-bottom: 1px solid #ddd;
    }

    .auto-header button {
      border: none;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    .home-btn {
      background: #4CAF50;
      color: white;
    }

    .theme-btn {
      background: transparent;
      font-size: 18px;
    }

    /* ===== Footer ===== */
    .auto-footer {
      text-align: center;
      padding: 15px;
      margin-top: 40px;
      font-size: 13px;
      color: #888;
    }

    /* ===== 浮动 Home ===== */
    .floating-home {
      position: fixed;
      right: 16px;
      bottom: 90px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #4CAF50;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      z-index: 9999;
    }

    /* ===== 主题 ===== */
    body.dark {
      background: #121212;
      color: #eee;
    }

    body.dark .auto-header {
      background: #1e1e1e;
      border-color: #333;
    }
  `;

  document.head.appendChild(style);

  // ===== Header =====
  const header = document.createElement("header");
  header.className = "auto-header";
  header.innerHTML = `
    <button class="home-btn">🏠 首页</button>
    <button class="theme-btn">🌙</button>
  `;
  document.body.prepend(header);

  // ===== Footer =====
  const footer = document.createElement("footer");
  footer.className = "auto-footer";
  footer.innerHTML = "© 2026 工具站 · Auto Layout System";
  document.body.appendChild(footer);

  // ===== 浮动 Home =====
  const homeBtn = document.createElement("div");
  homeBtn.className = "floating-home";
  homeBtn.innerHTML = "🏠";
  document.body.appendChild(homeBtn);

  // ===== 首页跳转 =====
  function goHome() {
    window.location.href = "/";
  }

  header.querySelector(".home-btn").onclick = goHome;
  homeBtn.onclick = goHome;

  // ===== 主题 =====
  const themeBtn = header.querySelector(".theme-btn");

  function setTheme(dark) {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    themeBtn.textContent = dark ? "☀️" : "🌙";
  }

  themeBtn.onclick = () => {
    setTheme(!document.body.classList.contains("dark"));
  };

  // 初始化主题
  setTheme(localStorage.getItem("theme") === "dark");
})();
