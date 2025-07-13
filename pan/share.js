document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const api = `https://pan.0515364.xyz/share/get`;
  const container = document.getElementById("share-content");

  // 渲染初始页面（无ID时）
  const renderInitialPage = () => {
    container.innerHTML = `
      <div class="input-group">
        <input type="text" id="shareLink" class="input-field" placeholder="请输入分享链接" />
      </div>
      <button id="submitBtn" class="btn"><i class="fas fa-check"></i> 确认</button>
    `;
    
    document.getElementById('submitBtn').addEventListener('click', processShareLink);
  };

  // 处理分享链接
  const processShareLink = () => {
    const shareLink = document.getElementById('shareLink').value.trim();
    if (!shareLink) {
      showError("请输入有效的分享链接");
      return;
    }

    try {
      const url = new URL(shareLink);
      const shareId = url.searchParams.get("id");
      if (shareId) {
        window.location.href = `share.html?id=${shareId}`;
      } else {
        showError("链接中未找到分享ID");
      }
    } catch (e) {
      showError("无效的分享链接格式");
    }
  };

  // 渲染密码输入表单
  const renderPasswordForm = (errorMsg = '') => {
    container.innerHTML = `
      ${errorMsg ? `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${errorMsg}</div>` : ''}
      <div class="input-group">
        <input type="password" id="password" class="input-field" placeholder="请输入访问密码" autofocus />
      </div>
      <button id="submitPassword" class="btn"><i class="fas fa-lock-open"></i> 提交密码</button>
    `;
    
    document.getElementById('submitPassword').addEventListener('click', submitPassword);
  };

  // 提交密码
  const submitPassword = async () => {
    const password = document.getElementById('password').value.trim();
    if (!password) {
      renderPasswordForm("请输入密码");
      return;
    }

    try {
      container.innerHTML = `
        <div class="loader"></div>
        <p>正在验证密码...</p>
      `;
      
      const response = await fetch(`${api}?id=${id}&password=${encodeURIComponent(password)}`);
      const data = await response.json();
      
      if (data.error) {
        renderPasswordForm(data.error);
      } else {
        renderFileInfo(data);
      }
    } catch (err) {
      showError("验证密码时出错，请重试");
    }
  };

  // 渲染文件信息
  const renderFileInfo = (data) => {
    const filename = data.file.split('/').pop();
    const downloadUrl = `https://pan.0515364.xyz/download?file=${encodeURIComponent(data.file)}`;
    
    container.innerHTML = `
      <div class="file-card">
        <div>
          <i class="fas fa-file-alt file-icon"></i> 
          <span class="file-name" title="${filename}">${filename}</span>
        </div>
        <a href="${downloadUrl}" class="btn" style="margin-top: 15px;">
          <i class="fas fa-download"></i> 下载文件
        </a>
        <div class="expiry-info"><i class="fas fa-clock"></i> 有效期至: ${new Date(data.expiresAt).toLocaleString()}</div>
      </div>
    `;
  };

  // 显示错误信息
  const showError = (message) => {
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i> ${message}
      </div>
      ${!id ? '<button id="goBack" class="btn"><i class="fas fa-arrow-left"></i> 返回</button>' : ''}
    `;
    
    if (!id) {
      document.getElementById('goBack').addEventListener('click', renderInitialPage);
    }
  };

  // 初始化
  const init = async () => {
    if (!id) {
      renderInitialPage();
      return;
    }

    try {
      const response = await fetch(`${api}?id=${id}`);
      const data = await response.json();

      if (data.error) {
        if (data.error.includes('密码')) {
          renderPasswordForm();
        } else {
          showError(data.error);
        }
      } else {
        if (data.password) {
          renderPasswordForm();
        } else {
          renderFileInfo(data);
        }
      }
    } catch (err) {
      showError("无法连接到服务器，请稍后再试");
    }
  };

  // 启动应用
  init();
});