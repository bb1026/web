const API_URL = 'https://message.0515364.xyz';

let currentPage = 1;
let limitPerPage = 10;
let adminPassword = '';
let captchaCode = '';
let isAdmin = false;

function generateCaptcha() {
  captchaCode = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById('captchaText').textContent = captchaCode;
}

function generateRandomName() {
  const longNumber = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
  return '访客' + longNumber;
}

function initName() {
  const nameInput = document.getElementById('nameInput');
  if (!nameInput.value.trim()) {
    const randomName = generateRandomName();
    nameInput.value = randomName;
    nameInput.classList.add('default-name');
    nameInput.dataset.default = randomName;
  }
}

function handleNameInputFocus(input) {
  if (input.classList.contains('default-name')) {
    input.value = '';
    input.classList.remove('default-name');
  }
}

function handleNameInputBlur(input) {
  if (!input.value.trim()) {
    input.value = input.dataset.default || generateRandomName();
    input.classList.add('default-name');
  }
}

async function loadMessages(reset = true) {
  const res = await fetch(`${API_URL}?page=${currentPage}&limit=${limitPerPage}`);
  const data = await res.json();

  const container = document.getElementById('messages');
  if (reset) container.innerHTML = '';

  data.messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message-item';

    let repliesHtml = '';
    if (Array.isArray(msg.replies)) {
      repliesHtml = msg.replies.map((reply, index) => {
        let adminControls = '';
        if (isAdmin) {
          adminControls = `
            <span class="admin-delete" onclick="deleteReply('${msg._key}', ${index})">删除</span>
            <span class="admin-edit" onclick="editReply('${msg._key}', ${index}, '${reply.message.replace(/'/g, "\\'")}')">修改</span>
          `;
        }
        return `<div class="reply">
          <b>${reply.name}</b>: <span id="replyText_${msg._key}_${index}">${reply.message}</span>
          ${adminControls}
        </div>`;
      }).join('');
    }

    let adminControls = '';
    if (isAdmin) {
      adminControls = `
        <div class="reply-area">
          <input type="text" placeholder="管理员回复" id="replyInput_${msg._key}">
          <button onclick="submitReply('${msg._key}')">提交回复</button>
          <button class="admin-delete" onclick="deleteMessage('${msg._key}')">删除留言</button>
        </div>
      `;
    }

    div.innerHTML = `
      <strong>${msg.name}</strong> (${new Date(msg.timestamp).toLocaleString()}):<br>
      ${msg.message}
      <div class="replies">${repliesHtml}</div>
      ${adminControls}
    `;

    container.appendChild(div);
  });

  document.getElementById('loadMoreBtn').style.display =
    data.total > currentPage * limitPerPage ? 'block' : 'none';
}

function loadMore() {
  currentPage++;
  loadMessages(false);
}

async function submitMessage() {
  const nameInput = document.getElementById('nameInput');
  const name = nameInput.value.trim() || nameInput.dataset.default;
  const message = document.getElementById('messageInput').value.trim();
  const captchaInput = document.getElementById('captchaInput').value.trim();
  const captchaError = document.getElementById('captchaError');

  captchaError.textContent = '';

  if (!message) {
    alert('请输入留言内容');
    return;
  }

  if (captchaInput !== captchaCode) {
    captchaError.textContent = '验证码错误';
    generateCaptcha();
    return;
  }

  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, message })
  });

  document.getElementById('messageInput').value = '';
  document.getElementById('captchaInput').value = '';
  generateCaptcha();
  captchaError.textContent = '';
  currentPage = 1;
  loadMessages();
}

async function submitReply(key) {
  const replyInput = document.getElementById(`replyInput_${key}`);
  const message = replyInput.value.trim();
  if (!message) {
    alert('请输入回复内容');
    return;
  }

  await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      name: '管理员',
      message,
      password: adminPassword
    })
  });

  replyInput.value = '';
  loadMessages();
}

async function deleteMessage(key) {
  if (!confirm('确认删除整条留言？')) return;

  await fetch(API_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword, key })
  });

  loadMessages();
}

async function deleteReply(key, index) {
  if (!confirm('确认删除这条回复？')) return;

  await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      delete_reply: index,
      password: adminPassword
    })
  });

  loadMessages();
}

function editReply(key, index, message) {
  const replySpan = document.getElementById(`replyText_${key}_${index}`);
  replySpan.innerHTML = `
    <input type="text" id="editInput_${key}_${index}" value="${message}">
    <button onclick="saveReply('${key}', ${index})">保存</button>
  `;
}

async function saveReply(key, index) {
  const newContent = document.getElementById(`editInput_${key}_${index}`).value.trim();
  if (!newContent) {
    alert('回复内容不能为空');
    return;
  }

  await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      update_reply: { index, message: newContent },
      password: adminPassword
    })
  });

  loadMessages();
}

function showAdminLogin() {
  const entry = document.getElementById('adminEntry');
  entry.innerHTML = `
    <input type="password" id="adminPassword" placeholder="管理员密码">
    <button onclick="adminLogin()">登录</button>
  `;
}

function logoutAdmin() {
  adminPassword = '';
  isAdmin = false;
  const entry = document.getElementById('adminEntry');
  entry.innerHTML = `<button onclick="showAdminLogin()">管理员入口</button>`;
  loadMessages();
}

async function adminLogin() {
  adminPassword = document.getElementById('adminPassword').value;
  if (!adminPassword) {
    alert('请输入密码');
    return;
  }

  isAdmin = true;
  const entry = document.getElementById('adminEntry');
  entry.innerHTML = `<button onclick="logoutAdmin()">退出管理</button>`;

  loadMessages();
}

initName();
generateCaptcha();
loadMessages();