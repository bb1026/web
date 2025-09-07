export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ================= 配置区域 =================
    // 需要注入的脚本（按顺序插入）
    const injectScripts = [
      "/js/floating-menu.js",
      "/js/main-header-notice-footer.js"
    ];

    // 需要排除注入的页面
    const excludePages = [
      "/pages/color.html"
    ];

    // 只处理的文件扩展名
    const htmlExt = ".html";
    // ===========================================

    // 只处理 HTML 页面
    if (url.pathname.endsWith(htmlExt)) {
      // 如果在排除列表里 → 原样返回
      if (excludePages.includes(url.pathname)) {
        return fetch(request);
      }

      // 获取原始页面
      let response = await fetch(`https://0515364.xyz${url.pathname}`);
      let text = await response.text();

      // 拼接脚本标签
      const scriptTags = injectScripts
        .map(src => `<script src="${src}"></script>`)
        .join("\n");

      // 注入到 </body> 之前
      text = text.replace("</body>", `${scriptTags}\n</body>`);

      return new Response(text, {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }

    // 非 HTML 文件 → 正常返回
    return fetch(request);
  }
};