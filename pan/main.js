let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();
const dynamicContainer = document.getElementById('dynamic-container');

// 登录功能
async function login() {
  const pwd = document.getElementById("pwd").value.trim();
  if (!pwd) return alert("请输入密码");
  
  try {
    const res = await fetch("https://pan.0515364.xyz/whoami", {
      method: "POST",
      body: pwd
    });
    
    if (!res.ok) throw new Error("登录失败");
    const data = await res.json();
    
    if (!data.role) return alert("密码错误");
    
    auth = pwd;
    role = data.role;
    document.getElementById("role").textContent = `当前角色：${role}`;
    document.getElementById("login-box").classList.add("hidden");
    document.querySelector(".logout-btn").classList.remove("hidden");
    
    // 动态生成主面板
    renderMainPanel();
    loadFiles();
    
    // 管理员加载回收站
    if (role === 'admin') {
      loadTrash();
    }
  } catch (err) {
    alert("登录失败：" + err.message);
  }
}

// 退出登录
function logout() {
  auth = null;
  role = null;
  document.getElementById("role").textContent = "未登录";
  document.getElementById("login-box").classList.remove("hidden");
  document.querySelector(".logout-btn").classList.add("hidden");
  dynamicContainer.innerHTML = ""; // 清空动态内容
  document.getElementById("pwd").value = "";
  fileList = [];
  selectedFiles.clear();
}

// 动态生成主面板
function renderMainPanel() {
  // 清空容器
  dynamicContainer.innerHTML = "";
  
  // 创建主面板
  const mainPanel = document.createElement('div');
  mainPanel.className = 'main-panel';
  mainPanel.id = 'main-panel';
  
  // 创建工具栏
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.innerHTML = `
    <input type="file" id="fileInput" multiple hidden onchange="upload()" />
    <button onclick="document.getElementById('fileInput').click()" class="btn-upload">
      📤 上传文件
    </button>
    <button onclick="newDir()">
      📁 新建文件夹
    </button>
    <button onclick="batchDelete()">
      🗑 批量删除
    </button>
    <button onclick="loadFiles()">
      🔄 刷新
    </button>
    <button id="userBtn" onclick="openUserModal()" style="display: ${role === 'admin' ? 'inline-flex' : 'none'};">
      👥 用户管理
    </button>
  `;
  
  // 创建文件列表区域
  const fileSection = document.createElement('div');
  fileSection.className = 'section';
  fileSection.innerHTML = `
    <h3>📂 文件列表</h3>
    <ul id="fileList" class="file-list"></ul>
  `;
  
  // 创建回收站（仅管理员可见）
  const trashPanel = document.createElement('div');
  trashPanel.className = `section ${role === 'admin' ? '' : 'hidden'}`;
  trashPanel.id = 'trash-panel';
  trashPanel.innerHTML = `
    <h3>🗑 回收站（7天自动清理）</h3>
    <ul id="trashList" class="file-list"></ul>
  `;
  
  // 组装主面板
  mainPanel.appendChild(toolbar);
  mainPanel.appendChild(fileSection);
  mainPanel.appendChild(trashPanel);
  dynamicContainer.appendChild(mainPanel);
}

// 动态创建用户管理模态框
function createUserModal() {
  // 检查是否已存在
  if (document.getElementById('userModal')) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal hidden';
  modal.id = 'userModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>👥 用户权限管理</h3>
      <table id="userTable">
        <thead><tr><th>密码</th><th>角色</th><th>操作</th></tr></thead>
        <tbody></tbody>
      </table>
      <div class="modal-actions">
        <input type="text" id="newUserKey" placeholder="设置密码">
        <select id="newUserRole">
          <option value="admin">admin</option>
          <option value="upload">upload</option>
          <option value="readonly">readonly</option>
        </select>
        <button onclick="addUser()">添加用户</button>
        <button onclick="closeUserModal()">关闭</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// 打开用户管理模态框
async function openUserModal() {
  if (!auth || role !== 'admin') return;
  
  createUserModal();
  const modal = document.getElementById('userModal');
  
  try {
    const res = await fetch(`https://pan.0515364.xyz/auth/manage?key=${auth}`);
    if (!res.ok) throw new Error("加载失败");
    
    const data = await res.json();
    const tbody = document.querySelector("#userTable tbody");
    tbody.innerHTML = "";
    
    data.users.forEach(u => {
      const canDelete = u.key !== auth; // 禁止删除自己
      const delBtn = canDelete ? 
        `<button onclick="deleteUser('${u.key}')">删除</button>` : 
        "<span style='color:#999'>不可删除</span>";
      
      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${u.key}</td>
          <td>${u.role}</td>
          <td>${delBtn}</td>
        </tr>
      `);
    });
    
    modal.classList.remove('hidden');
  } catch (err) {
    alert("加载用户列表失败：" + err.message);
  }
}

// 关闭用户管理模态框
function closeUserModal() {
  const modal = document.getElementById('userModal');
  if (modal) modal.classList.add('hidden');
}

// 加载文件列表
async function loadFiles() {
  if (!auth) return;
  
  try {
    const res = await fetch(`https://pan.0515364.xyz/list?key=${auth}`);
    if (!res.ok) throw new Error("加载失败");
    
    fileList = await res.json();
    renderFileList();
    selectedFiles.clear();
  } catch (err) {
    alert("加载文件失败：" + err.message);
  }
}

// 渲染文件列表
function renderFileList() {
  const ul = document.getElementById("fileList");
  if (!ul) return;
  
  ul.innerHTML = "";
  if (fileList.length === 0) {
    ul.innerHTML = '<li style="color:#999">暂无文件</li>';
    return;
  }
  
  fileList.forEach(file => {
    if (role === "readonly") {
      // 只读角色仅显示下载按钮
      ul.insertAdjacentHTML("beforeend", `
        <li>
          ${file.name} 
          <button onclick="downloadFile('${file.name}')">下载</button>
        </li>
      `);
    } else {
      // 其他角色显示完整操作
      const delBtn = role === "admin" || (role === "upload" && file.uploader === auth)
        ? `<button onclick="deleteFile('${file.name}')">删除</button>` 
        : "";
      
      const checkbox = `<input type="checkbox" onchange="toggleSelect('${file.name}', this.checked)">`;
      
      ul.insertAdjacentHTML("beforeend", `
        <li>
          ${checkbox} 
          ${file.name} 
          <button onclick="downloadFile('${file.name}')">下载</button> 
          ${delBtn}
        </li>
      `);
    }
  });
}

// 下载文件
async function downloadFile(name) {
  if (!auth) return alert("请先登录");
  
  try {
    const url = `https://pan.0515364.xyz/download?key=${auth}&file=${encodeURIComponent(name)}`;
    window.open(url, "_blank");
  } catch (err) {
    alert("下载失败：" + err.message);
  }
}

// 删除单个文件
async function deleteFile(name) {
  if (!auth) return alert("请先登录");
  if (!confirm(`确认删除 ${name}？`)) return;
  
  try {
    const res = await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { 
      method: "POST" 
    });
    
    if (!res.ok) throw new Error("删除失败");
    
    alert("删除成功");
    loadFiles();
  } catch (err) {
    alert("删除失败：" + err.message);
  }
}

// 批量删除
async function batchDelete() {
  if (selectedFiles.size === 0) return alert("请选择文件");
  if (!confirm(`确认删除选中的 ${selectedFiles.size} 个文件？`)) return;
  
  try {
    for (const name of selectedFiles) {
      await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { 
        method: "POST" 
      });
    }
    
    alert("批量删除完成");
    loadFiles();
    selectedFiles.clear();
  } catch (err) {
    alert("批量删除失败：" + err.message);
  }
}

// 新建文件夹
async function newDir() {
  if (!auth) return alert("请先登录");
  
  const name = prompt("请输入文件夹名称：");
  if (!name) return;
  
  try {
		const res = await fetch(https://pan.0515364.xyz/mkdir?key=${auth}, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ name })
});

if (!res.ok) throw new Error("创建失败");

alert(await res.text());
loadFiles();
} catch (err) {
alert("新建文件夹失败：" + err.message);
}
}

// 上传文件
async function upload() {
if (!auth) return alert("请先登录");

const input = document.getElementById("fileInput");
if (!input.files.length) return;

const maxSize = 50 * 1024 * 1024; // 50MB限制
let uploadSuccess = 0;
let uploadFail = 0;

try {
for (const file of input.files) {
if (file.size > maxSize) {
alert(${file.name} 超过50MB限制，已跳过);
uploadFail++;
continue;
}

const form = new FormData();
form.append("file", file);

const res = await fetch(https://pan.0515364.xyz/upload?key=${auth}, {
method: "POST",
body: form
});

if (res.ok) {
uploadSuccess++;
} else {
uploadFail++;
alert(${file.name} 上传失败);
}
}

input.value = "";
alert(上传完成：成功 ${uploadSuccess} 个，失败 ${uploadFail} 个);
loadFiles();
} catch (err) {
alert("上传过程出错：" + err.message);
}
}

// 加载回收站
async function loadTrash() {
if (!auth || role !== "admin") return;

try {
const res = await fetch(https://pan.0515364.xyz/trash/list?key=${auth});
if (!res.ok) throw new Error("加载失败");

const trash = await res.json();
const ul = document.getElementById("trashList");
ul.innerHTML = "";

if (trash.length === 0) {
ul.innerHTML = '回收站为空';
return;
}

trash.forEach(file => {
ul.insertAdjacentHTML("beforeend", <li> ${file.name}  <button onclick="restoreTrash('${file.name}')">还原</button>  <button onclick="deleteTrash('${file.name}')">彻底删除</button> </li>);
});
} catch (err) {
alert("加载回收站失败：" + err.message);
}
}

// 还原回收站文件
async function restoreTrash(name) {
if (!auth || role !== "admin") return;
if (!confirm(确认还原 ${name}？)) return;

try {
const res = await fetch(https://pan.0515364.xyz/trash/restore?key=${auth}&file=${encodeURIComponent(name)}, {
method: "POST"
});

if (!res.ok) throw new Error("还原失败");

alert("还原成功");
loadTrash();
loadFiles();
} catch (err) {
alert("还原失败：" + err.message);
}
}

// 彻底删除回收站文件
async function deleteTrash(name) {
if (!auth || role !== "admin") return;
if (!confirm(确认彻底删除 ${name}？此操作不可恢复)) return;

try {
const res = await fetch(https://pan.0515364.xyz/trash/delete?key=${auth}&file=${encodeURIComponent(name)}, {
method: "POST"
});

if (!res.ok) throw new Error("删除失败");

alert("彻底删除成功");
loadTrash();
} catch (err) {
alert("彻底删除失败：" + err.message);
}
}

// 添加用户
async function addUser() {
if (!auth || role !== "admin") return;

const key = document.getElementById("newUserKey").value.trim();
const roleVal = document.getElementById("newUserRole").value;

if (!key) return alert("请输入密码");

try {
const res = await fetch("https://pan.0515364.xyz/auth/manage", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
action: "add",
user: { key, role: roleVal },
key: auth
})
});

if (!res.ok) throw new Error("添加失败");

alert("添加用户成功");
document.getElementById("newUserKey").value = "";
openUserModal(); // 刷新列表
} catch (err) {
alert("添加用户失败：" + err.message);
}
}

// 删除用户
async function deleteUser(userKey) {
if (!auth || role !== "admin") return;
if (!confirm(确认删除用户 ${userKey}？)) return;

try {
const res = await fetch("https://pan.0515364.xyz/auth/manage", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
action: "delete",
user: { key: userKey },
key: auth
})
});

if (!res.ok) throw new Error("删除失败");

alert("删除用户成功");
openUserModal(); // 刷新列表
} catch (err) {
alert("删除用户失败：" + err.message);
}
}

// 选择文件（批量操作）
function toggleSelect(name, checked) {
if (checked) {
selectedFiles.add(name);
} else {
selectedFiles.delete(name);
}
}