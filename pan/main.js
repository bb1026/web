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

        loginBox.classList.add('hidden');
        roleElement.textContent = `当前角色：${roleNames[role] || role}`;
        roleElement.classList.remove('hidden');

        const logoutBtn = helpers.createButton('退出', 'sign-out-alt', 'logout-btn', authFunctions.logout);
        document.querySelector('.top-bar').appendChild(logoutBtn);

        currentPath = '';
        showTrash = false;
        fileFunctions.renderMainPanel();
        fileFunctions.loadFiles();
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

      const left = document.createElement('div');
      left.className = 'left';
      left.style.display = 'flex';
      left.style.flexDirection = 'column';

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.alignItems = 'center';
      topRow.style.gap = '8px';

      if (!showTrash && (role === 'admin' || role === 'upload')) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.onchange = () => cb.checked ? selectedFiles.add(file.name) : selectedFiles.delete(file.name);
        topRow.appendChild(cb);
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = file.name;
      nameSpan.style.wordBreak = 'break-word';
      topRow.appendChild(nameSpan);

      left.appendChild(topRow);

      const meta = document.createElement('div');
      meta.className = 'meta-info';
      let metaText = '';
      if (file.uploadTime) metaText += `上传时间：${new Date(file.uploadTime).toLocaleString()}`;
      if (role === 'admin' && file.uploader) metaText += ` 上传者：${file.uploader}`;
      meta.textContent = metaText;
      left.appendChild(meta);

      const right = document.createElement('div');
      right.className = 'right';

      if (!showTrash) {
  right.appendChild(helpers.createButton('下载', 'download', 'btn', () => downloadFile(file.name)));

  // ✅ 添加分享按钮（“分享”或“分享设置”）
  const shareLabel = shareState[file.name] ? '分享设置' : '分享';
  right.appendChild(helpers.createButton(shareLabel, 'share', 'btn', () => openShareModal(file.name)));

  if (role === 'admin' || (role === 'upload' && file.uploader === auth)) {
    right.appendChild(helpers.createButton('删除', 'trash', 'btn', () => deleteFile(file.name)));
  }
} else {
  right.appendChild(helpers.createButton('还原', 'undo', 'btn', () => restoreTrash(file.name)));
  right.appendChild(helpers.createButton('彻底删除', 'times', 'btn', () => deleteTrash(file.name)));
}

      li.appendChild(left);
      li.appendChild(right);
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
window.upload = async () => {
  const input = document.getElementById('fileInput');
  if (!input.files.length) return;

  for (const file of input.files) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${api.upload}?key=${auth}`, {
      method: "POST",
      body: form
    });
    if (!res.ok) helpers.showAlert(`${file.name} 上传失败`);
  }

  input.value = '';
  fileFunctions.loadFiles();
};

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


// === 添加分享 API ===
api.share = {
  create: "https://pan.0515364.xyz/share/create",
  cancel: "https://pan.0515364.xyz/share/cancel"
};

// === 分享状态存储 ===
const shareState = {}; // 结构：{ filename: { id, link, password, expiresAt } }

// === 注入分享弹窗 HTML ===
document.body.insertAdjacentHTML('beforeend', `
  <div id="share-modal" class="modal hidden">
    <div class="modal-content">
      <h2>分享设置</h2>
      <div class="form-group">
        <label>文件名：</label>
        <span id="share-filename"></span>
      </div>
      <div class="form-group" id="share-info-group" class="hidden">
        <label>已分享信息：</label>
        <div id="share-info"></div>
      </div>
      <div class="form-group" id="share-config-group">
        <label>有效期：</label>
        <select id="share-expiry">
          <option value="1d">1 天</option>
          <option value="3d">3 天</option>
          <option value="7d" selected>7 天</option>
          <option value="forever">永久</option>
        </select>
      </div>
      <div class="form-group">
        <label>密码保护：</label>
        <select id="share-password-type">
          <option value="none">无</option>
          <option value="random">随机密码</option>
          <option value="custom">自定义</option>
        </select>
        <input id="share-password" placeholder="输入自定义密码" class="hidden" />
      </div>
      <div class="form-group hidden" id="share-result-group">
        <label>分享链接：</label>
        <input id="share-result" readonly />
        <button onclick="navigator.clipboard.writeText(document.getElementById('share-result').value)">复制</button>
      </div>
      <div class="modal-actions">
        <button onclick="createShareConfirm()">创建</button>
        <button onclick="closeShareModal()">关闭</button>
        <button id="cancel-share-btn" class="hidden" onclick="cancelShare()">取消分享</button>
      </div>
    </div>
  </div>
`);

// === 分享弹窗样式 ===
const style = document.createElement('style');
style.textContent = `
.modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); display: flex;
  align-items: center; justify-content: center;
  z-index: 9999;
}
.modal.hidden { display: none; }
.modal-content {
  background: #fff; padding: 20px; border-radius: 8px; width: 300px;
}
.form-group { margin: 10px 0; }
.form-group label { display: block; font-weight: bold; }
.form-group input, select { width: 100%; padding: 6px; margin-top: 4px; }
.modal-actions { display: flex; justify-content: space-between; margin-top: 20px; }
`;
document.head.appendChild(style);

// === 打开分享弹窗 ===
window.openShareModal = (filename) => {
  document.getElementById('share-filename').textContent = filename;
  document.getElementById('share-modal').classList.remove('hidden');

  const info = shareState[filename];
  const infoGroup = document.getElementById('share-info-group');
  const resultGroup = document.getElementById('share-result-group');
  const cancelBtn = document.getElementById('cancel-share-btn');
  const passwordInput = document.getElementById('share-password');

  // 是否已分享
  if (info) {
    infoGroup.classList.remove('hidden');
    resultGroup.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');

    document.getElementById('share-info').innerHTML = `
      链接：<a href="${info.link}" target="_blank">${info.link}</a><br>
      ${info.password ? `密码：${info.password}<br>` : ''}
      有效期：${new Date(info.expiresAt).toLocaleString()}
    `;

    document.getElementById('share-result').value = info.link;
  } else {
    infoGroup.classList.add('hidden');
    resultGroup.classList.add('hidden');
    cancelBtn.classList.add('hidden');
    passwordInput.classList.add('hidden');
  }

  document.getElementById('share-password-type').onchange = e => {
    passwordInput.classList.toggle('hidden', e.target.value !== 'custom');
  };

  window.__shareFile = filename;
};

// === 关闭弹窗 ===
window.closeShareModal = () => {
  document.getElementById('share-modal').classList.add('hidden');
  delete window.__shareFile;
  delete window.__shareId;
  document.getElementById('cancel-share-btn').classList.add('hidden');
};







// === 创建分享 ===
window.createShareConfirm = async () => {
  const filename = window.__shareFile;
  if (!filename) return helpers.showAlert('❌ 未获取到文件名');

  const expiry = document.getElementById('share-expiry').value;
  const type = document.getElementById('share-password-type').value;
  const pwdInput = document.getElementById('share-password').value;

  let password = '';
  if (type === 'random') password = Math.random().toString(36).slice(2, 8);
  if (type === 'custom') {
    if (!pwdInput) return helpers.showAlert('❌ 请输入自定义密码');
    password = pwdInput;
  }

  if (!auth) return helpers.showAlert('❌ 登录信息缺失');

  const payload = {
    file: filename,
    passwordType: type,
    customPassword: password,
    expiresIn: expiry,
    key: auth
  };

  try {
    const res = await fetch(api.share.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      helpers.showAlert(`❌ 创建失败\n状态码: ${res.status}\n响应: ${text}`);
      return;
    }

    const result = await res.json();
    if (!result.link || !result.id) {
      helpers.showAlert('❌ 后端返回异常数据');
      return;
    }

    shareState[filename] = {
      id: result.id,
      link: result.link,
      password: result.password,
      expiresAt: result.expiresAt
    };
    window.__shareId = result.id;

    document.getElementById('share-result').value = result.link;
    document.getElementById('share-result-group').classList.remove('hidden');
    document.getElementById('cancel-share-btn').classList.remove('hidden');

    helpers.showAlert('✅ 分享创建成功');
    openShareModal(filename);
  } catch (err) {
    helpers.showAlert(`❌ 网络错误或浏览器限制\n${err.message || err}`);
  }
};










// === 取消分享 ===
window.cancelShare = async () => {
  const info = shareState[window.__shareFile];
  if (!info?.id) return helpers.showAlert('无有效分享记录');

  const res = await fetch(api.share.cancel, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: info.id, key: auth })
  });

  if (!res.ok) {
    const msg = await res.text();
    return helpers.showAlert(`取消失败：${msg}`);
  }

  delete shareState[window.__shareFile];
  helpers.showAlert('✅ 分享已取消');
  closeShareModal();
};