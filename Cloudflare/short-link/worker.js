function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

function randomCode(len = 5) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function isAuthed(req, env) {
  const cookie = req.headers.get("Cookie") || "";
  return cookie.includes("admin=" + env.ADMIN_PASSWORD);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    // ======================
    // 短链跳转
    // ======================
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];

      const { results } = await env.DB.prepare(
        "SELECT * FROM links WHERE code = ?"
      ).bind(code).all();

      const link = results[0];

      if (!link) return new Response("Not Found", { status: 404 });
      if (Number(link.enabled) !== 1) return new Response("Disabled", { status: 403 });

      await env.DB.prepare(
        "UPDATE links SET clicks = clicks + 1 WHERE code = ?"
      ).bind(code).run();

      return Response.redirect(link.url, 302);
    }

    // ======================
    // 创建短链 API
    // ======================
    if (path === "/api/create" && req.method === "POST") {
      const { url: longUrl, code } = await req.json();
      const shortCode = code || randomCode();

      await env.DB.prepare(
        "INSERT OR IGNORE INTO links (code, url) VALUES (?, ?)"
      ).bind(shortCode, longUrl).run();

      return json({
        ok: true,
        code: shortCode,
        shortUrl: `${url.origin}/s/${shortCode}`
      });
    }

    // ======================
    // 列表 API（需要登录）
    // ======================
    if (path === "/api/list") {
      if (!isAuthed(req, env)) return json({ error: "unauthorized" }, 401);

      const { results } = await env.DB.prepare(
        "SELECT * FROM links ORDER BY id DESC"
      ).all();

      return json(results);
    }

    // ======================
    // 删除
    // ======================
    if (path.startsWith("/api/delete/")) {
      if (!isAuthed(req, env)) return json({ error: "unauthorized" }, 401);

      const code = path.split("/api/delete/")[1];
      await env.DB.prepare("DELETE FROM links WHERE code = ?")
        .bind(code).run();

      return json({ ok: true });
    }

    // ======================
    // toggle
    // ======================
    if (path.startsWith("/api/toggle/")) {
      if (!isAuthed(req, env)) return json({ error: "unauthorized" }, 401);

      const code = path.split("/api/toggle/")[1];

      await env.DB.prepare(
        "UPDATE links SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE code=?"
      ).bind(code).run();

      return json({ ok: true });
    }

    // ======================
    // 登录 admin
    // ======================
    if (path === "/admin-login") {
      const page = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Admin Login</title>
<style>
body{font-family:Arial;background:#111;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh}
.box{background:#222;padding:20px;border-radius:10px}
input,button{padding:10px;margin:5px;width:200px}
</style>
</head>
<body>
<div class="box">
<h3>Admin Login</h3>
<input id="pw" type="password" placeholder="password">
<button onclick="login()">Login</button>
</div>

<script>
async function login(){
  const pw = document.getElementById('pw').value;
  document.cookie = "admin="+pw+"; path=/";
  location.href = "/admin";
}
</script>
</body>
</html>`;
      return html(page);
    }

    // ======================
    // admin 页面
    // ======================
    if (path === "/admin") {
      if (!isAuthed(req, env)) {
        return Response.redirect("/admin-login", 302);
      }

      return html(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Admin</title>
<style>
body{font-family:Arial;background:#111;color:#fff;padding:20px}
.card{background:#1e1e1e;padding:10px;margin:10px 0;border-radius:6px}
button{padding:8px;margin:3px}
.toast{position:fixed;bottom:20px;right:20px;background:#00c853;color:#fff;padding:10px;border-radius:6px;display:none}
</style>
</head>
<body>

<h2>Short Link Admin</h2>

<a href="/create">➕ 生成短链</a>

<div id="list"></div>

<div id="toast" class="toast"></div>

<script>
function show(msg){
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(()=>t.style.display='none',2000);
}

async function load(){
  const res = await fetch('/api/list');
  const data = await res.json();

  if(data.error){ location.href='/admin-login'; return; }

  let htmlStr = '';
  data.forEach(i=>{
    htmlStr += `
      <div class="card">
        <b>${i.code}</b><br>
        ${i.url}<br>
        点击:${i.clicks}
        <br><br>
        <button onclick="toggle('${i.code}')">启用/禁用</button>
        <button onclick="del('${i.code}')">删除</button>
      </div>`;
  });

  document.getElementById('list').innerHTML = htmlStr;
}

async function del(c){
  await fetch('/api/delete/'+c);
  show("删除成功");
  load();
}

async function toggle(c){
  await fetch('/api/toggle/'+c);
  show("已切换状态");
  load();
}

load();
</script>

</body>
</html>
`);
    }

    // ======================
    // 生成页面
    // ======================
    if (path === "/create") {
      return html(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Create Link</title>
<style>
body{font-family:Arial;background:#111;color:#fff;padding:20px}
.box{max-width:500px;margin:auto}
input,button{padding:10px;margin:5px;width:100%}
.toast{position:fixed;bottom:20px;right:20px;background:#00c853;padding:10px;display:none}
</style>
</head>
<body>

<div class="box">
<h2>Create Short Link</h2>

<input id="url" placeholder="long url">
<input id="code" placeholder="custom code (optional)">
<button onclick="create()">Generate</button>

<div id="toast" class="toast"></div>
</div>

<script>
function show(msg){
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(()=>t.style.display='none',2000);
}

async function create(){
  const url = document.getElementById('url').value;
  const code = document.getElementById('code').value;

  const res = await fetch('/api/create',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url,code})
  });

  const data = await res.json();

  if(data.ok){
    show("生成成功: " + data.shortUrl);
  } else {
    show("失败");
  }
}
</script>

</body>
</html>
`);
    }

    return new Response("OK");
  }
};