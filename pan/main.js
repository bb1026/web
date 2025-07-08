let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();

// 页面加载时强制隐藏用户管理模态框（优先级最高）
window.addEventListener('DOMContentLoaded', () => {
  const userModal = document.getElementById('userModal');
  // 强制隐藏，覆盖任何默认显示逻辑
  userModal.classList.add('hidden');
  // 双重保险：直接设置样式
  userModal.style.display = 'none';
});

// 登录
async function login() {
  const pwd = document.getElementById("pwd").value.trim();
  if (!pwd) return alert("请输入密码");
  const res = await fetch("https://pan.0515364.xyz/whoami", {
    method: "POST",
    body: pwd
  });
  const data = await res.json();
  if (!data.role) return alert("密码错误");
  
  auth = pwd;
  role = data.role;
  document.getElementById("role").textContent = role;
  document.getElementById("login-box").classList.add("hidden");
  document.getElementById("main-panel").classList.remove("hidden");
  document.querySelector(".logout-btn").classList.remove("hidden");
  
  // 管理员权限控制
  if (role === "admin") {
    document.getElementById("userBtn").style.display = "inline-block";
    document.getElementById("trash-panel").classList.remove("hidden");
    loadTrash();
  }
  
  // 登录后确保用户管理模态框隐藏
  document.getElementById("userModal").classList.add("hidden");
  loadFiles();
}

// 退出登录
function logout() {
  auth = null;
  role = null;
  document.getElementById("role").textContent = "未登录";
  document.getElementById("login-box").classList.remove("hidden");
  document.getElementById("main-panel").classList.add("hidden");
  document.querySelector(".logout-btn").classList.add("hidden");
  document.getElementById("userBtn").style.display = "none";
  document.getElementById("trash-panel").classList.add("hidden");
  
  // 退出时强制隐藏模态框
  const userModal = document.getElementById("userModal");
  userModal.classList.add("hidden");
  userModal.style.display = "none";
  
  // 清空数据
  fileList = [];
  selectedFiles.clear();
  document.getElementById("fileList").innerHTML = "";
  document.getElementById("trashList").innerHTML = "";
  document.getElementById("pwd").value = "";
}

// 打开用户管理模态框（严格权限校验）
async function openUserModal() {
  // 未登录或非管理员，强制隐藏并返回
  if (!auth || role !== "admin") {
    const userModal = document.getElementById("userModal");
    userModal.classList.add("hidden");
    userModal.style.display = "none";
    return;
  }
  
  // 加载用户列表（仅管理员可执行）
  const res = await fetch(`https://pan.0515364.xyz/auth/manage?key=${auth}`);
  if (!res.ok) return alert("加载用户列表失败");
  const data = await res.json();
  
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";
  data.users.forEach(u => {
    const canDelete = u.key !== auth; // 禁止删除自己
    const delBtn = canDelete ? `<button onclick="deleteUser('${u.key}')">删除</button>` : "";
    tbody.insertAdjacentHTML("beforeend", `<tr><td>${u.key}</td><td>${u.role}</td><td>${delBtn}</td></tr>`);
  });
  
  // 确认有权限后才显示
  const userModal = document.getElementById("userModal");
  userModal.classList.remove("hidden");
  userModal.style.display = "flex";
}

// 关闭用户管理模态框
function closeUserModal() {
  const userModal = document.getElementById("userModal");
  userModal.classList.add("hidden");
  userModal.style.display = "none";
}

// 其他功能逻辑（文件管理、回收站等，保持不变）
async function loadFiles() {
  if (!auth) return;
  const res = await fetch(`https://pan.0515364.xyz/list?key=${auth}`);
  if (!res.ok) return alert("加载文件失败");
  fileList = await res.json();
  renderFileList();
  selectedFiles.clear();
}

function renderFileList() {
  const ul = document.getElementById("fileList");
  ul.innerHTML = "";
  fileList.forEach(file => {
    if (role === "readonly") {
      ul.insertAdjacentHTML("beforeend", `<li>${file.name} <button onclick="downloadFile('${file.name}')">下载</button></li>`);
    } else {
      const delBtn = role === "admin" || (role === "upload" && file.uploader === auth)
        ? `<button onclick="deleteFile('${file.name}')">删除</button>` : "";
      const checkbox = `<input type="checkbox" onchange="toggleSelect('${file.name}', this.checked)">`;
      ul.insertAdjacentHTML("beforeend", `<li>${checkbox} ${file.name} <button onclick="downloadFile('${file.name}')">下载</button> ${delBtn}</li>`);
    }
  });
}

async function downloadFile(name) {
  if (!auth) return alert("请先登录");
  const url = `https://pan.0515364.xyz/download?key=${auth}&file=${encodeURIComponent(name)}`;
  window.open(url, "_blank");
}

async function deleteFile(name) {
  if (!confirm(`确认删除 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("删除失败");
  alert("删除成功");
  loadFiles();
}

async function batchDelete() {
  if (selectedFiles.size === 0) return alert("请选择文件");
  if (!confirm(`确认删除选中的 ${selectedFiles.size} 个文件？`)) return;
  for (const name of selectedFiles) {
    await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  }
  alert("批量删除完成");
  loadFiles();
  selectedFiles.clear();
}

async function newDir() {
  const name = prompt("请输入文件夹名称");
  if (!name) return;
  const res = await fetch(`https://pan.0515364.xyz/mkdir?key=${auth}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) return alert("新建失败");
  alert(await res.text());
  loadFiles();
}

async function upload() {
  if (!auth) return alert("请先登录");
  const input = document.getElementById("fileInput");
  if (!input.files.length) return;
  const maxSize = 50 * 1024 * 1024;
  for (const file of input.files) {
    if (file.size > maxSize) {
      alert(`${file.name} 超过50MB限制`);
      continue;
    }
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`https://pan.0515364.xyz/upload?key=${auth}`, {
      method: "POST",
      body: form
    });
    if (!res.ok) alert(`${file.name} 上传失败`);
  }
  input.value = "";
  alert("上传完成");
  loadFiles();
}

async function loadTrash() {
  if (!auth || role !== "admin") return;
  const res = await fetch(`https://pan.0515364.xyz/trash/list?key=${auth}`);
  if (!res.ok) return alert("加载回收站失败");
  const trash = await res.json();
  const ul = document.getElementById("trashList");
  ul.innerHTML = "";
  trash.forEach(file => {
    ul.insertAdjacentHTML("beforeend", `<li>${file.name} <button onclick="restoreTrash('${file.name}')">还原</button> <button onclick="deleteTrash('${file.name}')">彻底删除</button></li>`);
  });
}

async function restoreTrash(name) {
  if (!confirm(`确认还原 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/trash/restore?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("还原失败");
  alert("还原成功");
  loadTrash();
  loadFiles();
}

async function deleteTrash(name) {
  if (!confirm(`确认彻底删除 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/trash/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("删除失败");
  alert("彻底删除成功");
  loadTrash();
}

async function addUser() {
  const key = document.getElementById("newUserKey").value.trim();
  const roleVal = document.getElementById("newUserRole").value;
  if (!key) return alert("请输入密码");
  const res = await fetch("https://pan.0515364.xyz/auth/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", user: { key, role: roleVal }, key: auth })
  });
  if (!res.ok) return alert("添加失败");
  alert("添加成功");
  document.getElementById("newUserKey").value = "";
  openUserModal();
}

async function deleteUser(userKey) {
  if (!confirm(`确认删除用户 ${userKey}？`)) return
  {
const res = await fetch("https://pan.0515364.xyz/auth/manage", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ action: "delete", user: { key: userKey }, key: auth })
});
if (!res.ok) return alert("删除失败");
alert("删除成功");
openUserModal();
}

// 选择文件（批量操作）
function toggleSelect(name, checked) {
if (checked) selectedFiles.add(name);
else selectedFiles.delete(name);
}