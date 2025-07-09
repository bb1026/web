let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();
const dynamicContainer = document.getElementById('dynamic-container');

async function login() {
  const pwd = document.getElementById("pwd").value.trim();
  if (!pwd) return alert("请输入密码");

  try {
    const res = await fetch("https://pan.0515364.xyz/whoami", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: pwd
    });

    if (!res.ok) throw new Error("网络请求失败");

    const data = await res.json();

    if (data.role) {
      auth = pwd;
      role = data.role;

      document.getElementById("login-box").classList.add("hidden");
      document.getElementById("role").textContent = `当前角色：${role}`;
      document.querySelector(".logout-btn").classList.remove("hidden");

      renderMainPanel();
      loadFiles();
      if (role === 'admin') loadTrash();
    } else {
      alert("❌ 密码错误");
    }
  } catch (err) {
    alert("❌ 登录异常：" + err.message);
  }
}

function logout() {
  auth = null;
  role = null;
  fileList = [];
  selectedFiles.clear();
  document.getElementById("pwd").value = "";
  document.getElementById("login-box").classList.remove("hidden");
  document.getElementById("role").textContent = "未登录";
  document.querySelector(".logout-btn").classList.add("hidden");
  dynamicContainer.innerHTML = "";
}

function renderMainPanel() {
  dynamicContainer.innerHTML = `
    <div class="toolbar">
      <input type="file" id="fileInput" multiple hidden onchange="upload()" />
      <button onclick="document.getElementById('fileInput').click()">📤 上传文件</button>
      <button onclick="newDir()">📁 新建文件夹</button>
      <button onclick="batchDelete()">🗑 批量删除</button>
      <button onclick="loadFiles()">🔄 刷新</button>
      <button onclick="openUserModal()" style="display:${role === 'admin' ? 'inline-block' : 'none'}">👥 用户管理</button>
    </div>
    <div class="file-section">
      <h3>📂 文件列表</h3>
      <ul id="fileList" class="file-list"></ul>
    </div>
    <div class="trash-section" style="display:${role === 'admin' ? 'block' : 'none'}">
      <h3>🗑 回收站</h3>
      <ul id="trashList" class="file-list"></ul>
    </div>
  `;
}

async function loadFiles() {
  if (!auth) return;

  try {
    const res = await fetch(\`https://pan.0515364.xyz/list?key=\${auth}\`);
    if (!res.ok) throw new Error("加载失败");

    fileList = await res.json();
    renderFileList();
  } catch (err) {
    alert("加载文件失败：" + err.message);
  }
}

function renderFileList() {
  const ul = document.getElementById("fileList");
  ul.innerHTML = "";

  if (fileList.length === 0) {
    ul.innerHTML = '<li style="color:gray">暂无文件</li>';
    return;
  }

  fileList.forEach(file => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.onchange = () => toggleSelect(file.name, checkbox.checked);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = file.name;

    const downBtn = document.createElement("button");
    downBtn.textContent = "下载";
    downBtn.onclick = () => downloadFile(file.name);

    li.appendChild(checkbox);
    li.appendChild(nameSpan);
    li.appendChild(downBtn);

    if (role === "admin" || (role === "upload" && file.uploader === auth)) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "删除";
      delBtn.onclick = () => deleteFile(file.name);
      li.appendChild(delBtn);
    }

    ul.appendChild(li);
  });
}

function toggleSelect(name, checked) {
  if (checked) selectedFiles.add(name);
  else selectedFiles.delete(name);
}

async function downloadFile(name) {
  if (!auth) return alert("请先登录");
  const url = \`https://pan.0515364.xyz/download?key=\${auth}&file=\${encodeURIComponent(name)}\`;
  window.open(url, "_blank");
}

async function deleteFile(name) {
  if (!auth) return;
  if (!confirm(\`确认删除 \${name}？\`)) return;

  try {
    const res = await fetch(\`https://pan.0515364.xyz/delete?key=\${auth}&file=\${encodeURIComponent(name)}\`, { method: "POST" });
    if (!res.ok) throw new Error("删除失败");
    loadFiles();
  } catch (err) {
    alert("删除失败：" + err.message);
  }
}

async function batchDelete() {
  if (selectedFiles.size === 0) return alert("请选择文件");
  if (!confirm(\`确认删除 \${selectedFiles.size} 个文件？\`)) return;

  for (const name of selectedFiles) {
    await fetch(\`https://pan.0515364.xyz/delete?key=\${auth}&file=\${encodeURIComponent(name)}\`, { method: "POST" });
  }

  alert("批量删除完成");
  selectedFiles.clear();
  loadFiles();
}

async function newDir() {
  if (!auth) return;

  const name = prompt("请输入文件夹名称：");
  if (!name) return;

  try {
    const res = await fetch(\`https://pan.0515364.xyz/mkdir?key=\${auth}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error("创建失败");
    alert(await res.text());
    loadFiles();
  } catch (err) {
    alert("创建失败：" + err.message);
  }
}

async function upload() {
  if (!auth) return;
  const input = document.getElementById("fileInput");
  if (!input.files.length) return;

  for (const file of input.files) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(\`https://pan.0515364.xyz/upload?key=\${auth}\`, {
      method: "POST",
      body: form
    });

    if (!res.ok) alert(\`\${file.name} 上传失败\`);
  }

  input.value = "";
  loadFiles();
}

async function loadTrash() {
  try {
    const res = await fetch(\`https://pan.0515364.xyz/trash/list?key=\${auth}\`);
    if (!res.ok) throw new Error("获取失败");
    const trash = await res.json();

    const ul = document.getElementById("trashList");
    ul.innerHTML = "";
    trash.forEach(file => {
      const li = document.createElement("li");
      li.textContent = file.name;

      const restoreBtn = document.createElement("button");
      restoreBtn.textContent = "还原";
      restoreBtn.onclick = () => restoreTrash(file.name);

      const delBtn = document.createElement("button");
      delBtn.textContent = "彻底删除";
      delBtn.onclick = () => deleteTrash(file.name);

      li.appendChild(restoreBtn);
      li.appendChild(delBtn);
      ul.appendChild(li);
    });
  } catch (err) {
    alert("加载回收站失败：" + err.message);
  }
}

async function restoreTrash(name) {
  if (!confirm(\`确认还原 \${name}？\`)) return;
  const res = await fetch(\`https://pan.0515364.xyz/trash/restore?key=\${auth}&file=\${encodeURIComponent(name)}\`, { method: "POST" });
  if (res.ok) loadTrash();
}

async function deleteTrash(name) {
  if (!confirm(\`确认彻底删除 \${name}？\`)) return;
  const res = await fetch(\`https://pan.0515364.xyz/trash/delete?key=\${auth}&file=\${encodeURIComponent(name)}\`, { method: "POST" });
  if (res.ok) loadTrash();
}

async function openUserModal() {
  if (role !== 'admin') return;

  const users = await fetch(\`https://pan.0515364.xyz/auth/manage?key=\${auth}\`).then(r => r.json());
  const list = users.users.map(user =>
    \`<tr><td>\${user.key}</td><td>\${user.role}</td><td>\${user.key !== auth ? '<button onclick="deleteUser(\'\${user.key}\')">删除</button>' : '-'}</td></tr>\`
  ).join("");

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = \`
    <div class="modal-content">
      <h3>用户管理</h3>
      <table border="1"><thead><tr><th>密码</th><th>角色</th><th>操作</th></tr></thead><tbody>\${list}</tbody></table>
      <input id="newUserKey" placeholder="密码">
      <select id="newUserRole"><option value="admin">admin</option><option value="upload">upload</option><option value="readonly">readonly</option></select>
      <button onclick="addUser()">添加用户</button>
      <button onclick="this.parentNode.parentNode.remove()">关闭</button>
    </div>
  \`;

  document.body.appendChild(modal);
}

async function addUser() {
  const key = document.getElementById("newUserKey").value.trim();
  const roleVal = document.getElementById("newUserRole").value;
  if (!key) return alert("请输入密码");

  await fetch("https://pan.0515364.xyz/auth/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", user: { key, role: roleVal }, key: auth })
  });

  alert("添加成功");
  document.querySelector(".modal").remove();
  openUserModal();
}

async function deleteUser(keyToDelete) {
  if (!confirm(\`确认删除用户 \${keyToDelete}？\`)) return;
  await fetch("https://pan.0515364.xyz/auth/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", user: { key: keyToDelete }, key: auth })
  });
  alert("删除成功");
  document.querySelector(".modal").remove();
  openUserModal();
}
// 👇 将函数显式挂载到全局 window 对象
window.login = login;
window.logout = logout;
window.upload = upload;
window.newDir = newDir;
window.batchDelete = batchDelete;
window.openUserModal = openUserModal;