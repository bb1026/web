// footer.js
document.addEventListener('DOMContentLoaded', function() {
  const footerHTML = `
    <hr class="divider" />
    <footer class="site-footer">
      本站工具仅供学习与个人使用，内容生成后请自行核对准确性。<br>
      版权所有 © 2025 bb1026 | 由 
      <a href="https://chat.openai.com/" target="_blank">ChatGPT</a> 和 
      <a href="https://www.deepseek.com/" target="_blank">DeepSeek</a> 生成并优化。<br><br>
      <a href="/pages/about.html" class="footer-link">关于本站</a> | 
      <a href="/pages/about.html" class="footer-link">联系我们</a> | 
      <a href="/pages/about.html" class="footer-link">使用条款</a>
    </footer>

  // 插入到页脚容器
  const footerContainer = document.createElement('div');
  footerContainer.innerHTML = footerHTML;
  document.body.appendChild(footerContainer);
});