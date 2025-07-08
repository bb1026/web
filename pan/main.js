let auth = '', role = ''

async function login() {
  auth = document.getElementById("pwd").value.trim()
  const res = await fetch("https://pan.0515364.xyz/whoami", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: auth
  })
  const json = await res.json()
  if (json.role) {
    role = json.role
    document.getElementById("login-box").classList.add("hidden")
    document.getElementById("main-panel").classList.remove("hidden")
    document.getElementById("role").textContent = role
    loadFiles()
    if (role === "admin") {
      document.getElementById("trash-panel").classList.remove("hidden")
      loadTrash()
    }
  } else {
    alert("❌ 密码错误")
  }
  document.getElementById("pwd").value = ''
}

async function loadFiles() {
  const res = await fetch(`https://pan.0515364.xyz/list?key=${auth}`)
  const files = await res.json()
  const ul = document.getElementById("fileList")
  ul.innerHTML = ''
  files.forEach(f => {
    const li = document.createElement("li")
    li.innerHTML = `
      ${f.name} ${f.uploader ? '(上传者: ' + f.uploader + ')' : ''}
      <span>
        <a href="https://pan.0515364.xyz/download?file=${encodeURIComponent(f.name)}&key=${auth}" target="_blank">下载</a>
        ${canDelete(f) ? `<button onclick="deleteFile('${f.name}')">删除</button>` : ''}
        <button onclick="shareFile('${f.name}')">分享</button>
      </span>`
    ul.appendChild(li)
  })
}

function canDelete(file) {
  return role === 'admin' || (role === 'upload' && file.uploader === auth)
}

const MAX_SIZE_MB = 50

async function upload() {
  const input = document.getElementById("fileInput")
  const files = input.files
  if (!files.length) return alert("请选择文件")

  for (const file of files) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`❌ 文件 "${file.name}" 超过 ${MAX_SIZE_MB}MB 限制，已跳过`)
      continue
    }

    const fd = new FormData()
    fd.append("file", file)
    fd.append("key", auth)

    try {
      const res = await fetch("https://pan.0515364.xyz/upload", {
        method: "POST",
        body: fd
      })
      const text = await res.text()
      console.log(text)
    } catch (e) {
      alert(`❌ 上传失败: ${file.name}`)
    }
  }

  alert("✅ 批量上传完成")
  input.value = ''
  loadFiles()
}

async function deleteFile(name) {
  if (!confirm("确认删除？")) return
  const res = await fetch(`https://pan.0515364.xyz/delete?file=${encodeURIComponent(name)}&key=${auth}`)
  alert(await res.text())
  loadFiles()
  if (role === "admin") loadTrash()
}

async function batchDelete() {
  if (!confirm("确认批量删除？")) return
  const res = await fetch(`https://pan.0515364.xyz/batchdel?key=${auth}`, { method: "POST" })
  alert(await res.text())
  loadFiles()
  if (role === "admin") loadTrash()
}

async function newDir() {
  const name = prompt("📂 请输入文件夹名称")
  if (!name || name.includes("/")) return alert("❌ 名称不能为空或包含 /")

  try {
    const res = await fetch("https://pan.0515364.xyz/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), key: auth })
    })
    const msg = await res.text()
    alert(msg)
    loadFiles()
  } catch (e) {
    alert("❌ 创建失败")
  }
}

async function loadTrash() {
  const res = await fetch(`https://pan.0515364.xyz/trash/list?key=${auth}`)
  const files = await res.json()
  const ul = document.getElementById("trashList")
  ul.innerHTML = ''
  files.forEach(f => {
    const li = document.createElement("li")
    li.textContent = `${f.name}（删除于 ${new Date(+f.deletedAt).toLocaleString()}）`
    ul.appendChild(li)
  })
}

async function openShareManager() {
  const res = await fetch(`https://pan.0515364.xyz/share/list?key=${auth}`)
  const list = await res.json()
  let html = '分享链接：\n'
  list.forEach(s => {
    html += `${s.id}: ${s.name} [${s.password ? '🔐' : '🔓'}, 有效至 ${new Date(+s.expiresAt).toLocaleString()}]\n`
  })
  html += '\n输入要取消的分享ID：'
  const id = prompt(html)
  if (id) {
    const r = await fetch(`https://pan.0515364.xyz/share/cancel?id=${encodeURIComponent(id)}&key=${auth}`)
    alert(await r.text())
    loadFiles()
  }
}

async function shareFile(name) {
  const pass = prompt("设置分享密码（必填）：")
  if (!pass) return alert("密码必填")
  const dur = prompt("有效期（分钟数，如60，1440=24h，留空=永久）：")
  const res = await fetch(`https://pan.0515364.xyz/share/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: auth, name, password: pass, duration: dur ? +dur : 0 })
  })
  const data = await res.json()
  if (data.id) {
    alert(`分享成功！链接: https://pan.0515364.xyz/share/${data.id}`)
  } else {
    alert(data.error || '失败')
  }
}
