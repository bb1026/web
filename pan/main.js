let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();

// 页面加载时确保模态框隐藏
window.onload = () => {
  document.getElementById("userModal").classList.add("hidden");
};

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
  if (role === "admin") {
    document.getElementById("userBtn").style.display = "inline-block";
    document.getElementById("trash-panel").classList.remove("hidden");
    loadTrash();
  }
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
  document.getElementById("userModal").classList.add("hidden");
  document.getElementById("fileList").innerHTML = "";
  document.getElementById("trashList").innerHTML = "";
  document.getElementById("pwd").value = "";
  fileList = [];
  selectedFiles.clear();
}

// 加载文件列表
async function loadFiles() {
  if (!auth) return;
  const res = await fetch(`https://pan.0515364.xyz/list?key=${auth}`);
  if (!res.ok) return alert("加载文件失败");
  fileList = await res.json();
  renderFileList();
  selectedFiles.clear();
}

// 渲染文件列表
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

// 选择文件
function toggleSelect(name, checked) {
  if (checked) selectedFiles.add(name);
  else selectedFiles.delete(name);
}

// 下载文件
async function downloadFile(name) {
  if (!auth) return alert("请先登录");
  const url = `https://pan.0515364.xyz/download?key=${auth}&file=${encodeURIComponent(name)}`;
  window.open(url, "_blank");
}

// 删除文件
async function deleteFile(name) {
  if (!confirm(`确认删除 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("删除失败");
  alert("删除成功");
  loadFiles();
}

// 批量删除
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

// 新建文件夹
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

// 上传文件
async function upload() {
  if (!auth) return alert("请先登录");
  const input = document.getElementById("fileInput");
  if (!input.files.length) return;
  const maxSize = 50 * 1024 * 1024; // 50MB限制
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

// 加载回收站
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

// 还原回收站文件
async function restoreTrash(name) {
  if (!confirm(`确认还原 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/trash/restore?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("还原失败");
alert("还原成功");
loadTrash();
loadFiles();
}

// 彻底删除回收站文件
async function deleteTrash(name) {
if (!confirm(确认彻底删除 ${name}？)) return;
const res = await fetch(https://pan.0515364.xyz/trash/delete?key=${auth}&file=${encodeURIComponent(name)}, { method: "POST" });
if (!res.ok) return alert("删除失败");
alert("彻底删除成功");
loadTrash();
}

// 打开用户管理模态框
async function openUserModal() {
const res = await fetch(https://pan.0515364.xyz/auth/manage?key=${auth});
if (!res.ok) return alert("加载用户列表失败");
const data = await res.json();
const tbody = document.querySelector("#userTable tbody");
tbody.innerHTML = "";
data.users.forEach(u => {
const canDelete = u.key !== auth; // 禁止删除当前登录用户
const delBtn = canDelete ? <button onclick="deleteUser('${u.key}')">删除</button> : "";
tbody.insertAdjacentHTML("beforeend", <tr><td>${u.key}</td><td>${u.role}</td><td>${delBtn}</td></tr>);
});
document.getElementById("userModal").classList.remove("hidden");
}

// 关闭用户管理模态框
function closeUserModal() {
document.getElementById("userModal").classList.add("hidden");
}

// 添加用户
async function addUser() {
const key = document.getElementById("newUserKey").value.trim();
const roleVal = document.getElementById("newUserRole").value;
if (!key) return alert("请输入密码");
const res = await fetch("https://pan.0515364.xyz/auth/manage", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
action: "add",
user: { key, role: roleVal },
key: auth
})
});
if (!res.ok) return alert("添加失败");
alert("添加成功");
document.getElementById("newUserKey").value = ""; // 清空输入框
openUserModal(); // 刷新用户列表
}

// 删除用户
async function deleteUser(userKey) {
if (!confirm(确认删除用户 ${userKey}？)) return;
const res = await fetch("https://pan.0515364.xyz/auth/manage", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
action: "delete",
user: { key: userKey },
key: auth
})
});
if (!res.ok) return alert("删除失败");
alert("删除成功");
openUserModal(); // 刷新用户列表
}