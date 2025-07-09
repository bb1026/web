let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();
const dynamicContainer = document.getElementById('dynamic-container');
const loginBox = document.getElementById('login-box');
const pwdInput = document.getElementById('pwd');
const roleElement = document.getElementById('role');

// Role display names
const roleNames = {
  admin: '管理员',
  upload: '高级用户',
  readonly: '普通用户'
};

// API endpoints
const api = {
  whoami: "https://pan.0515364.xyz/whoami",
  list: "https://pan.0515364.xyz/list",
  download: "https://pan.0515364.xyz/download",
  delete: "https://pan.0515364.xyz/delete",
  mkdir: "https://pan.0515364.xyz/mkdir",
  upload: "https://pan.0515364.xyz/upload",
  trash: {
    list: "https://pan.0515364.xyz/trash/list",
    restore: "https://pan.0515364.xyz/trash/restore",
    delete: "https://pan.0515364.xyz/trash/delete"
  },
  auth: {
    manage: "https://pan.0515364.xyz/auth/manage"
  }
};

// Helper functions
const helpers = {
  showAlert: (message, isError = true) => {
    alert(`${isError ? '❌' : '✅'} ${message}`);
  },
  
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

// Main functions
const authFunctions = {
  login: async () => {
    const pwd = pwdInput.value.trim();
    if (!pwd) return helpers.showAlert('请输入密码');

    try {
      const res = await fetch(api.whoami, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: pwd
      });

      if (!res.ok) throw new Error("网络请求失败");

      const data = await res.json();
      if (data.role) {
        auth = pwd;
        role = data.role;

        loginBox.classList.add("hidden");
        roleElement.textContent = `当前角色：${roleNames[role] || role}`;
        roleElement.classList.remove("hidden");

        // Create logout button
        const logoutBtn = helpers.createButton('退出', 'sign-out-alt', 'logout-btn', authFunctions.logout);
        document.querySelector(".top-bar").appendChild(logoutBtn);

        fileFunctions.renderMainPanel();
        fileFunctions.loadFiles();
        if (role === 'admin') fileFunctions.loadTrash();
      } else {
        helpers.showAlert("密码错误");
      }
    } catch (err) {
      helpers.showAlert(`登录异常：${err.message}`);
    }
  },

  logout: () => {
    auth = null;
    role = null;
    fileList = [];
    selectedFiles.clear();
    pwdInput.value = "";
    loginBox.classList.remove("hidden");
    roleElement.textContent = "";
    roleElement.classList.add("hidden");
    
    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) logoutBtn.remove();
    
    dynamicContainer.innerHTML = "";
  }
};

const fileFunctions = {
  renderMainPanel: () => {
    dynamicContainer.innerHTML = `
      <div class="toolbar">
        <input type="file" id="fileInput" multiple hidden onchange="fileFunctions.upload()" />
        <button onclick="document.getElementById('fileInput').click()" ${role !== 'admin' && role !== 'upload' ? 'style="display:none"' : ''}>
          <i class="fas fa-upload"></i> 上传文件
        </button>
        <button onclick="fileFunctions.newDir()" ${role !== 'admin' ? 'style="display:none"' : ''}>
          <i class="fas fa-folder-plus"></i> 新建文件夹
        </button>
        <button onclick="fileFunctions.batchDelete()" ${role !== 'admin' && role !== 'upload' ? 'style="display:none"' : ''}>
          <i class="fas fa-trash"></i> 批量删除
        </button>
        <button onclick="fileFunctions.loadFiles()">
          <i class="fas fa-sync-alt"></i> 刷新
        </button>
        <button onclick="userFunctions.openUserModal()" ${role !== 'admin' ? 'style="display:none"' : ''}>
          <i class="fas fa-users-cog"></i> 用户管理
        </button>
      </div>
      <div class="file-section">
        <h3><i class="fas fa-folder-open"></i> 文件列表</h3>
        <ul id="fileList" class="file-list"></ul>
      </div>
      <div class="trash-section" style="display:${role === 'admin' ? 'block' : 'none'}">
        <h3><i class="fas fa-trash-alt"></i> 回收站</h3>
        <ul id="trashList" class="file-list"></ul>
      </div>
    `;
  },

  loadFiles: async () => {
    const res = await helpers.fetchWithAuth(api.list);
    if (!res) return;
    
    fileList = await res.json();
    fileFunctions.renderFileList();
  },

  renderFileList: () => {
    const ul = document.getElementById("fileList");
    ul.innerHTML = '';
    
    if (fileList.length === 0) {
      ul.innerHTML = '<li class="empty-state">暂无文件</li>';
      return;
    }

    fileList.forEach(file => {
      const li = document.createElement("li");
      
      if (role === 'admin' || role === 'upload') {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.onchange = () => {
          if (checkbox.checked) {
            selectedFiles.add(file.name);
          } else {
            selectedFiles.delete(file.name);
          }
        };
        li.appendChild(checkbox);
      }

      const nameSpan = document.createElement("span");
      nameSpan.textContent = file.name;
      li.appendChild(nameSpan);

      li.appendChild(helpers.createButton('下载', 'download', 'download-btn', () => fileFunctions.downloadFile(file.name)));

      if (role === "admin" || (role === "upload" && file.uploader === auth)) {
        li.appendChild(helpers.createButton('删除', 'trash', 'delete-btn', () => fileFunctions.deleteFile(file.name)));
      }

      ul.appendChild(li);
    });
  },

  downloadFile: async (name) => {
    const res = await helpers.fetchWithAuth(`${api.download}&file=${encodeURIComponent(name)}`);
    if (!res) return;
    
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.split("/").pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  deleteFile: async (name) => {
    if (!confirm(`确认删除 ${name}？`)) return;
    
    const res = await helpers.fetchWithAuth(`${api.delete}&file=${encodeURIComponent(name)}`, { method: "POST" });
    if (!res) return;
    
    fileFunctions.loadFiles();
    if (role === 'admin') fileFunctions.loadTrash();
  },

  batchDelete: async () => {
    if (selectedFiles.size === 0) return helpers.showAlert("请选择文件");
    if (!confirm(`确认删除 ${selectedFiles.size} 个文件？`)) return;

    try {
      for (const name of selectedFiles) {
        await fetch(`${api.delete}?key=${auth}&file=${encodeURIComponent(name)}`, {
          method: "POST"
        });
      }
      helpers.showAlert("批量删除完成", false);
      selectedFiles.clear();
      fileFunctions.loadFiles();
      if (role === 'admin') fileFunctions.loadTrash();
    } catch (err) {
      helpers.showAlert("批量删除失败：" + err.message);
    }
  },

  newDir: async () => {
    const name = prompt("请输入文件夹名称：");
    if (!name) return;

    const res = await helpers.fetchWithAuth(api.mkdir, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res) return;
    
    helpers.showAlert(await res.text(), false);
    fileFunctions.loadFiles();
  },

  upload: async () => {
    const input = document.getElementById("fileInput");
    if (!input.files.length) return;

    try {
      for (const file of input.files) {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${api.upload}?key=${auth}`, {
          method: "POST",
          body: form
        });

        if (!res.ok) helpers.showAlert(`${file.name} 上传失败`);
      }

      input.value = "";
      fileFunctions.loadFiles();
    } catch (err) {
      helpers.showAlert("上传失败：" + err.message);
    }
  },

  loadTrash: async () => {
    const res = await helpers.fetchWithAuth(api.trash.list);
    if (!res) return;
    
    const trash = await res.json();
    const ul = document.getElementById("trashList");
    ul.innerHTML = '';
    
    if (trash.length === 0) {
      ul.innerHTML = '<li class="empty-state">回收站为空</li>';
      return;
    }

    trash.forEach(file => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${file.name}</span>`;
      li.appendChild(helpers.createButton('还原', 'undo', 'restore-btn', () => fileFunctions.restoreTrash(file.name)));
      li.appendChild(helpers.createButton('彻底删除', 'trash', 'delete-btn', () => fileFunctions.deleteTrash(file.name)));
      ul.appendChild(li);
    });
  },

  restoreTrash: async (name) => {
    if (!confirm(`确认还原 ${name}？`)) return;
    
    const res = await helpers.fetchWithAuth(`${api.trash.restore}&file=${encodeURIComponent(name)}`, { method: "POST" });
    if (!res) return;
    
    fileFunctions.loadTrash();
    fileFunctions.loadFiles();
  },

  deleteTrash: async (name) => {
    if (!confirm(`确认彻底删除 ${name}？`)) return;
    
    const res = await helpers.fetchWithAuth(`${api.trash.delete}&file=${encodeURIComponent(name)}`, { method: "POST" });
    if (!res) return;
    
    fileFunctions.loadTrash();
  }
};

const userFunctions = {
  openUserModal: async () => {
    const res = await helpers.fetchWithAuth(api.auth.manage);
    if (!res) return;
    
    const users = await res.json();
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3><i class="fas fa-users-cog"></i> 用户管理</h3>
        <table border="1">
          <thead>
            <tr>
              <th>密码</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="userTableBody">
            ${users.users.map(user => `
              <tr>
                <td>${user.key}</td>
                <td>${roleNames[user.role] || user.role}</td>
                <td>
                  ${user.key !== auth ? `
                    <button onclick="userFunctions.deleteUser('${user.key}')">
                      <i class="fas fa-user-minus"></i> 删除
                    </button>
                  ` : '<span style="color:#999">当前用户</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="add-user-form">
          <input id="newUserKey" placeholder="输入新用户密码" type="password">
          <select id="newUserRole">
            ${Object.entries(roleNames).map(([value, text]) => `
              <option value="${value}">${text}</option>
            `).join('')}
          </select>
          <button onclick="userFunctions.addUser()">
            <i class="fas fa-user-plus"></i> 添加用户
          </button>
        </div>
        <button onclick="this.parentNode.parentNode.remove()">
          <i class="fas fa-times"></i> 关闭
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  addUser: async () => {
    const key = document.getElementById("newUserKey").value.trim();
    const roleVal = document.getElementById("newUserRole").value;
    if (!key) return helpers.showAlert("请输入密码");

    const res = await helpers.fetchWithAuth(api.auth.manage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", user: { key, role: roleVal }, key: auth })
    });
    if (!res) return;
    
    helpers.showAlert("添加成功", false);
    document.querySelector(".modal").remove();
    userFunctions.openUserModal();
  },

  deleteUser: async (keyToDelete) => {
    if (!confirm(`确认删除用户 ${keyToDelete}？此操作不可撤销！`)) return;
    
    const res = await helpers.fetchWithAuth(api.auth.manage, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", user: { key: keyToDelete }, key: auth })
    });
    if (!res) return;
    
    helpers.showAlert("删除成功", false);
    document.querySelector(".modal").remove();
    userFunctions.openUserModal();
  }
};

// Global exports
window.login = authFunctions.login;
window.logout = authFunctions.logout;
window.upload = fileFunctions.upload;
window.newDir = fileFunctions.newDir;
window.batchDelete = fileFunctions.batchDelete;
window.openUserModal = userFunctions.openUserModal;
window.addUser = userFunctions.addUser;
window.deleteUser = userFunctions.deleteUser;
window.downloadFile = fileFunctions.downloadFile;
window.deleteFile = fileFunctions.deleteFile;
window.restoreTrash = fileFunctions.restoreTrash;
window.deleteTrash = fileFunctions.deleteTrash;