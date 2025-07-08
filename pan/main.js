
let auth = null;
let role = null;
let fileList = [];
let selectedFiles = new Set();

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

function logout() {
  auth = null;
  role = null;
  document.getElementById("role").textContent = "未登录";
  document.getElementById("login-box").classList.remove("hidden");
  document.getElementById("main-panel").classList.add("hidden");
  document.querySelector(".logout-btn").classList.add("hidden");
  document.getElementById("userBtn").style.display = "none";
  document.getElementById("trash-panel").classList.add("hidden");
  fileList = [];
  selectedFiles.clear();
  document.getElementById("fileList").innerHTML = "";
  document.getElementById("trashList").innerHTML = "";
  document.getElementById("pwd").value = "";
}

// 文件列表加载
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
      // 只显示文件，不显示操作按钮
      if (file.type !== "file") return;
      ul.insertAdjacentHTML("beforeend", `<li>${file.name} <button onclick="downloadFile('${file.name}')">下载</button></li>`);
    } else {
      const delBtn = role === "admin" || (role === "upload" && file.uploader === auth)
        ? `<button onclick="deleteFile('${file.name}')">删除</button>` : "";
      const checkbox = `<input type="checkbox" onchange="toggleSelect('${file.name}', this.checked)">`;
      ul.insertAdjacentHTML("beforeend", `<li>${checkbox} ${file.name} <button onclick="downloadFile('${file.name}')">下载</button> ${delBtn}</li>`);
    }
  });
}

function toggleSelect(name, checked) {
  if (checked) selectedFiles.add(name);
  else selectedFiles.delete(name);
}

async function downloadFile(name) {
  if (!auth) return alert("请先登录");
  const url = `https://pan.0515364.xyz/download?key=${auth}&file=${encodeURIComponent(name)}`;
  window.open(url, "_blank");
}

async function deleteFile(name) {
  if (!confirm(`确认删除文件 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("删除失败");
  alert("删除成功");
  loadFiles();
}

async function batchDelete() {
  if (selectedFiles.size === 0) return alert("请先选择文件或文件夹");
  if (!confirm(`确认删除选中 ${selectedFiles.size} 个文件/文件夹？`)) return;
  for (const name of selectedFiles) {
    await fetch(`https://pan.0515364.xyz/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  }
  alert("批量删除完成");
  loadFiles();
  selectedFiles.clear();
}

async function newDir() {
  const name = prompt("请输入新文件夹名称");
  if (!name) return;
  const res = await fetch(`https://pan.0515364.xyz/mkdir?key=${auth}&name=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("新建文件夹失败");
  alert("新建成功");
  loadFiles();
}

async function upload() {
  if (!auth) return alert("请先登录");
  const input = document.getElementById("fileInput");
  if (!input.files.length) return;
  const maxSize = 50 * 1024 * 1024; // 单次上传限制50MB
  for (const file of input.files) {
    if (file.size > maxSize) {
      alert(`文件 ${file.name} 超过50MB限制`);
      continue;
    }
    const form = new FormData();
    form.append("key", auth);
    form.append("file", file);
    const res = await fetch("https://pan.0515364.xyz/upload", { method: "POST", body: form });
    if (!res.ok) alert(`上传文件 ${file.name} 失败`);
  }
  input.value = "";
  alert("上传完成");
  loadFiles();
}

// 回收站
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
  if (!confirm(`确认还原文件 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/trash/restore?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("还原失败");
  alert("还原成功");
  loadTrash();
  loadFiles();
}

async function deleteTrash(name) {
  if (!confirm(`确认彻底删除文件 ${name}？`)) return;
  const res = await fetch(`https://pan.0515364.xyz/trash/delete?key=${auth}&file=${encodeURIComponent(name)}`, { method: "POST" });
  if (!res.ok) return alert("删除失败");
  alert("删除成功");
  loadTrash();
}

// 用户管理相关
async function openUserModal() {
  const res = await fetch(`https://pan.0515364.xyz/auth/manage?key=${auth}`);
  if (!res.ok) return alert("加载用户管理失败");
  const data = await res.json();
  const tbody = document.querySelector("#userTable tbody");
  tbody.innerHTML = "";
  data.users.forEach(u => {
    const canDelete = u.key !== auth;
    const delBtn = canDelete ? `<button onclick="deleteUser('${u.key}')">删除</button>` : "";
    tbody.insertAdjacentHTML("beforeend", `<tr><td>${u.key}</td><td>${u.role}</td><td>${delBtn}</td></tr>`);
  });
  document.getElementById("userModal").classList.remove("hidden");
}

function closeUserModal() {
  document.getElementById("userModal").classList.add("hidden");
}

async function addUser() {
  const key = document.getElementById("newUserKey").value.trim();
  const roleSel = document.getElementById("newUserRole");
  const roleVal = roleSel.value;
  if (!key) return alert("请输入密码");
  const res = await fetch("https://pan.0515364.xyz/auth/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", user: { key, role: roleVal }, key: auth })
  });
  const msg = await res.text();
  alert(msg);
  openUserModal();
}

async function deleteUser(userKey) {
  if (!confirm(`确认删除用户 "${userKey}"？`)) return;
  const res = await fetch("https://pan.0515364.xyz/auth/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", user: { key: userKey }, key: auth })
  });
  const msg = await res.text();
  alert(msg);
  openUserModal();
}
