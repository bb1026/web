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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    // ======================
    // 短链接跳转 /s/xxx
    // ======================
    if (path.startsWith("/s/")) {
      const code = path.split("/s/")[1];

      const { results } = await env.DB.prepare(
        "SELECT * FROM links WHERE code = ?"
      ).bind(code).all();

      const link = results[0];

      if (!link) return new Response("Not Found", { status: 404 });

      if (link.enabled !== 1) {
        return new Response("Disabled", { status: 403 });
      }

      await env.DB.prepare(
        "UPDATE links SET clicks = clicks + 1 WHERE code = ?"
      ).bind(code).run();

      return Response.redirect(link.url, 302);
    }

    // ======================
    // API：创建短链
    // ======================
    if (path === "/api/create" && req.method === "POST") {
      const { url: longUrl, code } = await req.json();

      let shortCode = code || randomCode();

      await env.DB.prepare(
        "INSERT INTO links (code, url) VALUES (?, ?)"
      ).bind(shortCode, longUrl).run();

      return json({
        ok: true,
        code: shortCode,
        shortUrl: `${url.origin}/s/${shortCode}`
      });
    }

    // ======================
    // API：列表
    // ======================
    if (path === "/api/list") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM links ORDER BY id DESC"
      ).all();

      return json(results);
    }

    // ======================
    // API：删除
    // ======================
    if (path.startsWith("/api/delete/")) {
      const code = path.split("/api/delete/")[1];

      await env.DB.prepare(
        "DELETE FROM links WHERE code = ?"
      ).bind(code).run();

      return json({ ok: true });
    }

    // ======================
    // API：启用/禁用
    // ======================
    if (path.startsWith("/api/toggle/")) {
      const code = path.split("/api/toggle/")[1];

      await env.DB.prepare(
        "UPDATE links SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE code=?"
      ).bind(code).run();

      return json({ ok: true });
    }

    // ======================
    // 管理后台 /admin
    // ======================
    if (path === "/admin") {
      return html(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Short Link Admin</title>
<style>
body{font-family:Arial;background:#111;color:#fff;padding:20px}
input,button{padding:10px;margin:5px}
.card{background:#1e1e1e;padding:10px;margin:10px 0;border-radius:6px}
button{cursor:pointer}
</style>
</head>
<body>

<h2>短链接后台</h2>

<div>
<input id="url" placeholder="长网址" style="width:300px">
<input id="code" placeholder="自定义短码(可选)">
<button onclick="create()">生成</button>
</div>

<h3>列表</h3>
<div id="list"></div>

<script>
async function load(){
  let res = await fetch('/api/list');
  let data = await res.json();

  document.getElementById('list').innerHTML =
    data.map(i=>`
      <div class="card">
        <b>${i.code}</b><br>
        ${i.url}<br>
        点击:${i.clicks} | ${i.enabled ? '启用':'禁用'}<br><br>
        <button onclick="toggle('${i.code}')">启用/禁用</button>
        <button onclick="del('${i.code}')">删除</button>
      </div>
    `).join('');
}

async function create(){
  let url = document.getElementById('url').value;
  let code = document.getElementById('code').value;

  await fetch('/api/create',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url,code})
  });

  load();
}

async function del(code){
  await fetch('/api/delete/'+code);
  load();
}

async function toggle(code){
  await fetch('/api/toggle/'+code);
  load();
}

load();
</script>

</body>
</html>
      `);
    }

    return new Response("OK");
  }
};
