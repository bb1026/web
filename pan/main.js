let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();
let currentPath = "";
let showTrash = false;

const dynamicContainer = document.getElementById('dynamic-container');
const loginBox = document.getElementById('login-box');
const pwdInput = document.getElementById('pwd');
const roleElement = document.getElementById('role');

const roleNames = {
  admin: '管理员',
  upload: '高级用户',
  readonly: '普通用户'
};

const api = {
  whoami: "https://pan.0515364.xyz/whoami",
  list: "https://pan.0515364.xyz/list",
  download: "https://pan.0515364.xyz/download",
  delete: "https://pan.0515364.xyz/delete",
  upload: "https://pan.0515364.xyz/upload",
  trash: {
    list: "https://pan.0515364.xyz/trash/list",
    restore: "https://pan.0515364.xyz/trash/restore",
    delete: "https://pan.0515364.xyz/trash/delete"
  },
  share: {
    create: "https://pan.0515364.xyz/share/create",
    cancel: "https://pan.0515364.xyz/share/cancel",
    list: "https://pan.0515364.xyz/share/list"
  }
};

const helpers = {
  showAlert: (msg, isErr = true) => alert((isErr ? '❌ ' : '✅ ') + msg),

  fetchWithAuth: async (url, options = {}) => {
    if (!auth) {
      helpers.showAlert('请先登录');
      return null;
    }
    try {
      const fullUrl = url.includes('?') ? `${url}&key=${auth}` : `${url}?key=${auth}`;
      const res = await fetch(fullUrl, options);
      if (!res.ok) throw new Error(await res.text());
      return res;
    } catch (err) {
      helpers.showAlert(err.message);
      return null;
    }
  },

  createButton: (text, icon, className, onClick) => {
    const btn = document.createElement('button');
    btn.className = className;
    btn.innerHTML = `<i class="fas fa-${icon}"></i> ${text}`;
    btn.onclick = onClick;
    return btn;
  }
};

const authFunctions = {
  login: async () => {
    const pwd = pwdInput.value.trim();
    if (!pwd) return helpers.showAlert('请输入密码');

    try {
      const res = await fetch(api.whoami, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: pwd
      });

      const data = await res.json();
      if (data.role) {
        auth = pwd;
        role = data.role;

        localStorage.setItem('auth', auth);
        localStorage.setItem('role', role);

        loginBox.classList.add('hidden');
        roleElement.textContent = `当前角色：${roleNames[role] || role}`;
        roleElement.classList.remove('hidden');

        if (!document.querySelector('.logout-btn')) {
          const logoutBtn = helpers.createButton('退出', 'sign-out-alt', 'logout-btn', authFunctions.logout);
          document.querySelector('.top-bar').appendChild(logoutBtn);
        }

        currentPath = '';
        showTrash = false;
        fileFunctions.renderMainPanel();
        await fileFunctions.loadFiles();
        await shareFunctions.loadAllShares();
      } else {
        helpers.showAlert('密码错误');
      }
    } catch (err) {
      helpers.showAlert('登录异常：' + err.message);
    }
  },

  logout: () => {
    auth = null;
    role = null;

    localStorage.removeItem('auth');
    localStorage.removeItem('role');

    fileList = [];
    selectedFiles.clear();
    currentPath = '';
    showTrash = false;

    pwdInput.value = '';
    loginBox.classList.remove('hidden');
    roleElement.textContent = '';
    roleElement.classList.add('hidden');

    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) logoutBtn.remove();

    dynamicContainer.innerHTML = '';
  }
};

const shareState = {};

const shareFunctions = {
  loadAllShares: async () => {
    if (!auth) return;
    try {
      const res = await helpers.fetchWithAuth(api.share.list);
      if (!res) return;
      const data = await res.json();
      shareStateClear();
      data.forEach(item => {
        shareState[item.file] = {
          id: item.id,
          link: item.link,
          password: item.password,
          expiresAt: item.expiresAt,
          passwordType: item.passwordType
        };
      });
      fileFunctions.renderFileList();
    } catch {
      // 不阻塞主流程
    }
  }
};

function shareStateClear() {
  for (const key in shareState) {
    if (Object.hasOwnProperty.call(shareState, key)) {
      delete shareState[key];
    }
  }
}

const fileFunctions = {
  renderMainPanel: () => {
    dynamicContainer.innerHTML = `
      <div class="toolbar">
        <input type="file" id="fileInput" multiple hidden onchange="upload()" />
        ${(role === 'admin' || role === 'upload') ? `<button onclick="document.getElementById('fileInput').click()"><i class="fas fa-upload"></i> 上传</button>` : ''}
        ${(role === 'admin' || role === 'upload') ? `<button onclick="batchDelete()"><i class="fas fa-trash"></i> 批量删除</button>` : ''}
        <button onclick="loadFiles()"><i class="fas fa-sync"></i> 刷新</button>
        <button onclick="toggleTrash()"><i class="fas fa-trash-alt"></i> 回收站</button>
        ${currentPath ? `<button onclick="goBack()"><i class="fas fa-arrow-left"></i> 返回上一级</button>` : ''}
      </div>
      <div class="path-nav" style="margin:6px 0;">${fileFunctions.renderPathNav()}</div>
      <div class="file-section">
        <h3><i class="fas fa-folder-open"></i> ${showTrash ? '<a href="javascript:toggleTrash()">返回主目录</a>' : '文件列表'}</h3>
        <ul id="fileList" class="file-list"></ul>
      </div>
    `;
  },

  renderPathNav: () => {
    if (!currentPath) return '<span>根目录</span>';
    const parts = currentPath.split('/').filter(p => p);
    let pathAcc = '';
    return parts.map(p => {
      pathAcc += p + '/';
      return `<a href="javascript:navigateTo('${pathAcc}')">${p}</a>`;
    }).join(' / ');
  },

  loadFiles: async () => {
    if (showTrash) return fileFunctions.loadTrash();
    const res = await helpers.fetchWithAuth(`${api.list}?path=${encodeURIComponent(currentPath)}`);
    if (!res) return;
    const raw = await res.json();
    fileList = raw.sort((a, b) => a.name.localeCompare(b.name));
    fileFunctions.renderFileList();
  },

renderFileList: () => {
  const ul = document.getElementById('fileList');
  ul.innerHTML = '';
  if (fileList.length === 0) {
    ul.innerHTML = `<li class="empty-state">${showTrash ? '回收站为空' : '暂无文件'}</li>`;
    return;
  }

  fileList.forEach(file => {
    const li = document.createElement('li');
    li.style.padding = '10px 0';
    li.style.borderBottom = '1px solid #eee';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '4px';

    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '8px';
    topRow.style.overflow = 'hidden';

    if (!showTrash && (role === 'admin' || role === 'upload')) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.onchange = () => cb.checked ? selectedFiles.add(file.name) : selectedFiles.delete(file.name);
      topRow.appendChild(cb);
    }


    const nameSpan = document.createElement('span');
const fullName = file.name;
const shortName = fullName.length > 20 ? fullName.slice(0, 20) + '...' : fullName;

let isExpanded = false;
nameSpan.textContent = shortName;
nameSpan.title = fullName;
nameSpan.style.flex = '1';
nameSpan.style.minWidth = '0';
nameSpan.style.overflow = 'hidden';
nameSpan.style.whiteSpace = 'nowrap';
nameSpan.style.textOverflow = 'ellipsis';
nameSpan.style.cursor = 'pointer';
nameSpan.style.userSelect = 'none';

nameSpan.onclick = () => {
  isExpanded = !isExpanded;
  nameSpan.textContent = isExpanded ? fullName : shortName;
};


    topRow.appendChild(nameSpan);

    if (!showTrash && shareState[file.name]) {
      const sharedMark = document.createElement('span');
      sharedMark.style.color = '#1890ff';
      sharedMark.style.marginLeft = '10px';
      sharedMark.textContent = '【已分享】';
      topRow.appendChild(sharedMark);
    }

    left.appendChild(topRow);

    const meta = document.createElement('div');
    meta.className = 'meta-info';
    meta.style.fontSize = '12px';
    meta.style.color = '#666';
    let metaText = '';
    if (file.uploadTime) metaText += `上传时间：${new Date(file.uploadTime).toLocaleString()}`;
    if (role === 'admin' && file.uploader) metaText += ` 上传者：${file.uploader}`;
    meta.textContent = metaText;
    left.appendChild(meta);

    // 新位置：按钮放到 left 下面
    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.flexWrap = 'wrap';
    buttonRow.style.gap = '8px';
    buttonRow.style.marginTop = '6px';

    if (!showTrash) {
      buttonRow.appendChild(helpers.createButton('下载', 'download', 'btn download-btn', () => downloadFile(file.name)));

      const shareLabel = shareState[file.name] ? '设置' : '分享';
      buttonRow.appendChild(helpers.createButton(shareLabel, 'share', 'btn', () => openShareModal(file.name)));

      if (role === 'admin' || (role === 'upload' && file.uploader === auth)) {
        buttonRow.appendChild(helpers.createButton('删除', 'trash', 'btn delete-btn', () => deleteFile(file.name)));
      }
    } else {
      buttonRow.appendChild(helpers.createButton('还原', 'undo', 'btn restore-btn', () => restoreTrash(file.name)));
      buttonRow.appendChild(helpers.createButton('彻底删除', 'times', 'btn delete-btn', () => deleteTrash(file.name)));
    }

    left.appendChild(buttonRow);

    li.appendChild(left);
    ul.appendChild(li);
  });
},

  loadTrash: async () => {
    const res = await helpers.fetchWithAuth(api.trash.list);
    if (!res) return;
    fileList = await res.json();
    fileFunctions.renderFileList();
  }
};

function navigateTo(path) {
  currentPath = path;
  showTrash = false;
  fileFunctions.renderMainPanel();
  fileFunctions.loadFiles();
}

function goBack() {
  if (!currentPath) return;
  const parts = currentPath.split('/').filter(Boolean);
  parts.pop();
  currentPath = parts.length > 0 ? parts.join('/') + '/' : '';
  fileFunctions.renderMainPanel();
  fileFunctions.loadFiles();
}

function toggleTrash() {
  showTrash = !showTrash;
  currentPath = '';
  fileFunctions.renderMainPanel();
  fileFunctions.loadFiles();
}

window.login = authFunctions.login;
window.logout = authFunctions.logout;








// ... [前面的代码保持不变，直到 window.upload 函数] ...

window.upload = async () => {
  const input = document.getElementById('fileInput');
  if (!input.files.length) return;

  // 创建上传进度容器（保持原始逻辑不变，只添加UI元素）
  const progressContainer = document.createElement('div');
  progressContainer.className = 'progress-container';
  progressContainer.innerHTML = `
    <div class="progress-bar">
      <div class="progress-indicator"></div>
    </div>
    <div class="progress-text">准备上传 ${input.files.length} 个文件...</div>
  `;
  document.querySelector('.toolbar').insertAdjacentElement('afterend', progressContainer);

  const progressIndicator = progressContainer.querySelector('.progress-indicator');
  const progressText = progressContainer.querySelector('.progress-text');

  let uploadedCount = 0;
  const totalFiles = input.files.length;

  // 完全保持原始上传逻辑，只添加进度更新
  for (const file of input.files) {
    const form = new FormData();
    form.append("file", file);
    
    try {
      // 更新进度文本
      progressText.textContent = `正在上传 ${file.name} (${uploadedCount+1}/${totalFiles})`;
      
      // 完全保持原始fetch请求
      const res = await fetch(`${api.upload}?key=${auth}`, {
        method: "POST",
        body: form
      });
      
      if (!res.ok) {
        helpers.showAlert(`${file.name} 上传失败`);
      } else {
        uploadedCount++;
        // 更新进度条
        const percent = Math.round((uploadedCount / totalFiles) * 100);
        progressIndicator.style.width = `${percent}%`;
      }
    } catch (err) {
      helpers.showAlert(`${file.name} 上传失败: ${err.message}`);
    }
  }

  // 完成后的处理（保持原始逻辑）
  progressIndicator.style.width = '100%';
  progressIndicator.style.backgroundColor = '#4CAF50';
  progressText.textContent = `上传完成 (${uploadedCount}/${totalFiles})`;
  
  // 3秒后移除进度条
  setTimeout(() => {
    progressContainer.remove();
  }, 3000);

  input.value = '';
  fileFunctions.loadFiles(); // 保持原始刷新逻辑
};

// ... [后面的代码保持不变] ...










window.batchDelete = async () => {
  if (selectedFiles.size === 0) return helpers.showAlert('请选择文件');
  if (!confirm(`确认删除 ${selectedFiles.size} 个文件？`)) return;

  for (const name of selectedFiles) {
    await fetch(`${api.delete}?key=${auth}&file=${encodeURIComponent(name)}`, { method: 'POST' });
  }
  selectedFiles.clear();
  fileFunctions.loadFiles();
};

window.downloadFile = async (name) => {
  const res = await helpers.fetchWithAuth(`${api.download}?file=${encodeURIComponent(name)}`);
  if (!res) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.split('/').pop();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

window.deleteFile = async (name) => {
  if (!confirm(`确认删除 ${name}？`)) return;
  const res = await helpers.fetchWithAuth(`${api.delete}?file=${encodeURIComponent(name)}`, { method: 'POST' });
  if (res) fileFunctions.loadFiles();
};

window.restoreTrash = async (name) => {
  if (!confirm(`确认还原 ${name}？`)) return;
  const res = await helpers.fetchWithAuth(`${api.trash.restore}?file=${encodeURIComponent(name)}`, { method: 'POST' });
  if (res) {
    fileFunctions.loadTrash();
    fileFunctions.loadFiles();
  }
};

window.deleteTrash = async (name) => {
  if (!confirm(`确认彻底删除 ${name}？`)) return;
  const res = await helpers.fetchWithAuth(`${api.trash.delete}?file=${encodeURIComponent(name)}`, { method: 'POST' });
  if (res) fileFunctions.loadTrash();
};

// 分享弹窗相关
if (!document.getElementById('share-modal')) {
  document.body.insertAdjacentHTML('beforeend', `
<div id="share-modal" class="modal hidden" aria-modal="true" role="dialog" aria-labelledby="share-modal-title">
  <div class="modal-content">
    <h2 id="share-modal-title"><i class="fas fa-share-nodes"></i> 分享设置</h2>
    <div class="form-group">
      <label><i class="fas fa-file"></i> 文件名：</label>
      <span id="share-filename"></span>
    </div>
    <div class="form-group hidden" id="share-info-group">
      <label><i class="fas fa-circle-info"></i> 已分享信息：</label>
      <div id="share-info"></div>
    </div>
    <div class="form-group" id="share-config-group">
      <label><i class="fas fa-clock"></i> 有效期：</label>
      <select id="share-expiry">
        <option value="1d">1 天</option>
        <option value="3d">3 天</option>
        <option value="7d" selected>7 天</option>
        <option value="forever">永久</option>
      </select>
    </div>
    <div class="form-group">
      <label><i class="fas fa-lock"></i> 密码保护：</label>
      <select id="share-password-type">
        <option value="none">无</option>
        <option value="random">随机密码</option>
        <option value="custom">自定义</option>
      </select>
      <input id="share-password" placeholder="输入自定义密码" class="hidden" autocomplete="new-password" />
    </div>
    <div class="form-group hidden" id="share-result-group">
      <label><i class="fas fa-link"></i> 分享链接：</label>
      <input id="share-result" readonly />
      <button type="button" id="copy-link-btn"><i class="fas fa-copy"></i> 复制</button>
    </div>
    <div class="modal-actions">
      <button type="button" id="create-share-btn"><i class="fas fa-plus"></i> 创建</button>
      <button type="button" id="close-share-btn"><i class="fas fa-xmark"></i> 关闭</button>
      <button type="button" id="cancel-share-btn" class="hidden"><i class="fas fa-trash"></i> 取消分享</button>
    </div>
  </div>
</div>
`);
}

const shareModal = document.getElementById('share-modal');
const shareFilenameSpan = document.getElementById('share-filename');
const shareInfoGroup = document.getElementById('share-info-group');
const shareInfoDiv = document.getElementById('share-info');
const shareConfigGroup = document.getElementById('share-config-group');
const shareExpirySelect = document.getElementById('share-expiry');
const sharePasswordTypeSelect = document.getElementById('share-password-type');
const sharePasswordInput = document.getElementById('share-password');
const shareResultGroup = document.getElementById('share-result-group');
const shareResultInput = document.getElementById('share-result');
const cancelShareBtn = document.getElementById('cancel-share-btn');
const createShareBtn = document.getElementById('create-share-btn');
const closeShareBtn = document.getElementById('close-share-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');

window.__shareFile = null;

window.openShareModal = (filename) => {
  window.__shareFile = filename;
  shareFilenameSpan.textContent = filename;
  shareModal.classList.remove('hidden');

  const info = shareState[filename];
  if (info) {
    shareInfoGroup.classList.remove('hidden');
    shareResultGroup.classList.remove('hidden');
    cancelShareBtn.classList.remove('hidden');

    shareResultInput.value = info.link;

    shareInfoDiv.innerHTML = `
      链接：<a href="${info.link}" target="_blank">${info.link}</a><br>
      ${info.password ? `密码：${info.password}<br>` : ''}
      有效期：${new Date(info.expiresAt).toLocaleString()}
    `;

    sharePasswordTypeSelect.value = info.passwordType || 'none';
    if (info.passwordType === 'custom') {
      sharePasswordInput.classList.remove('hidden');
      sharePasswordInput.value = info.password || '';
    } else {
      sharePasswordInput.classList.add('hidden');
      sharePasswordInput.value = '';
    }

    const expireTime = new Date(info.expiresAt);
    if (expireTime < new Date()) {
      shareExpirySelect.value = '7d';
    } else {
      const diffMs = expireTime - Date.now();
      if (diffMs < 1 * 24 * 60 * 60 * 1000) shareExpirySelect.value = '1d';
      else if (diffMs < 3 * 24 * 60 * 60 * 1000) shareExpirySelect.value = '3d';
      else if (diffMs < 7 * 24 * 60 * 60 * 1000) shareExpirySelect.value = '7d';
      else shareExpirySelect.value = 'forever';
    }
  } else {
    shareInfoGroup.classList.add('hidden');
    shareResultGroup.classList.add('hidden');
    cancelShareBtn.classList.add('hidden');
    sharePasswordTypeSelect.value = 'none';
    sharePasswordInput.classList.add('hidden');
    sharePasswordInput.value = '';
    shareExpirySelect.value = '7d';
  }
};

sharePasswordTypeSelect.onchange = () => {
  if (sharePasswordTypeSelect.value === 'custom') {
    sharePasswordInput.classList.remove('hidden');
    sharePasswordInput.focus();
  } else {
    sharePasswordInput.classList.add('hidden');
  }
};

createShareBtn.onclick = async () => {
  const filename = window.__shareFile;
  if (!filename) return helpers.showAlert('❌ 未获取到文件名');

  const expiresIn = shareExpirySelect.value;
  const passwordType = sharePasswordTypeSelect.value;
  let customPassword = '';

  if (passwordType === 'random') {
    customPassword = Math.random().toString(36).slice(-6);
  } else if (passwordType === 'custom') {
    customPassword = sharePasswordInput.value.trim();
    if (!customPassword) {
      return helpers.showAlert('请输入自定义密码');
    }
  }

  try {
    const res = await fetch(api.share.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: auth,
        file: filename,
        passwordType,
        customPassword,
        expiresIn
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || '分享失败');
    }

    const data = await res.json();
    shareState[filename] = {
      id: data.id,
      link: data.link,
      password: data.password,
      passwordType: passwordType,
      expiresAt: data.expiresAt
    };

    helpers.showAlert('分享成功', false);
    fileFunctions.renderFileList();
    window.openShareModal(filename);
  } catch (err) {
    helpers.showAlert(err.message);
  }
};

cancelShareBtn.onclick = async () => {
  const filename = window.__shareFile;
  if (!filename || !shareState[filename]) return;

  if (!confirm(`确认取消分享文件 "${filename}" 吗？`)) return;

  try {
    const res = await fetch(api.share.cancel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: auth,
        id: shareState[filename].id
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || '取消分享失败');
    }

    delete shareState[filename];
    helpers.showAlert('取消分享成功', false);

    shareModal.classList.add('hidden');
    fileFunctions.renderFileList();
  } catch (err) {
    helpers.showAlert(err.message);
  }
};

closeShareBtn.onclick = () => {
  shareModal.classList.add('hidden');
};

copyLinkBtn.onclick = () => {
  const filename = window.__shareFile;
  if (!filename || !shareState[filename]) return;

  const info = shareState[filename];
  let textToCopy = `分享链接: ${info.link}\n`;
  if (info.password) {
    textToCopy += `密码: ${info.password}\n`;
  }
  textToCopy += `有效期至: ${new Date(info.expiresAt).toLocaleString()}`;

  navigator.clipboard.writeText(textToCopy)
    .then(() => helpers.showAlert('链接、密码和有效期已复制', false))
    .catch(() => helpers.showAlert('复制失败'));
};

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !shareModal.classList.contains('hidden')) {
    shareModal.classList.add('hidden');
  }
});

window.addEventListener('load', async () => {
  const savedAuth = localStorage.getItem('auth');
  const savedRole = localStorage.getItem('role');
  if (savedAuth && savedRole) {
    auth = savedAuth;
    role = savedRole;
    loginBox.classList.add('hidden');
    roleElement.textContent = `当前角色：${roleNames[role] || role}`;
    roleElement.classList.remove('hidden');

    if (!document.querySelector('.logout-btn')) {
      const logoutBtn = helpers.createButton('退出', 'sign-out-alt', 'logout-btn', authFunctions.logout);
      document.querySelector('.top-bar').appendChild(logoutBtn);
    }

    fileFunctions.renderMainPanel();
    await fileFunctions.loadFiles();
    await shareFunctions.loadAllShares();
  } else {
    loginBox.classList.remove('hidden');
  }
});