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
right.className = 'file-actions';
right.style.display = 'flex';
right.style.flexDirection = 'row';
right.style.gap = '6px';

      if (!showTrash) {
  right.appendChild(helpers.createButton('', 'download', 'download-btn', () => downloadFile(file.name)));
  if (role === 'admin' || (role === 'upload' && file.uploader === auth)) {
    right.appendChild(helpers.createButton('', 'trash', 'delete-btn', () => deleteFile(file.name)));
    right.appendChild(helpers.createButton('', 'share-alt', 'share-btn', () => shareFile(file.name)));
  }
} else {
        right.appendChild(helpers.createButton('', 'undo', 'btn', () => restoreTrash(file.name)));
        right.appendChild(helpers.createButton('', 'trash', 'btn', () => deleteTrash(file.name)));
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

window.shareFile = async (file) => {
  const days = prompt("请输入过期天数（默认3天）：", "3");
  const expireIn = parseInt(days || "3") * 24 * 3600 * 1000;

  const res = await fetch("https://pan.0515364.xyz/share/create?key=" + auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, expireIn })
  });

  if (!res.ok) {
    const errText = await res.text();
    helpers.showAlert("分享失败：" + errText);
  } else {
    const token = await res.text();
    const shareLink = `${location.origin}/share.html?token=${token}`;
    navigator.clipboard.writeText(shareLink);
    helpers.showAlert("✅ 分享链接已复制到剪贴板：\n" + shareLink, false);
  }
};