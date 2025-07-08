export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const pathname = decodeURIComponent(url.pathname.slice(1))

    if (request.method === 'GET' && pathname === '') {
      return new Response(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>
          <h2>📁 网盘 - pan.0515364.xyz</h2>
          <form method="POST" enctype="multipart/form-data">
            <input type="file" name="file" /><br/><br/>
            <input type="password" name="key" placeholder="上传密码" />
            <button type="submit">上传</button>
          </form>
          <hr/>
          <ul id="list">加载中...</ul>
          <script>
            fetch('/list').then(r => r.json()).then(data => {
              list.innerHTML = data.map(f => \`<li><a href="/\${f}" target="_blank">\${f}</a></li>\`).join('')
            })
          </script>
        </body></html>
      `, { headers: { "content-type": "text/html; charset=utf-8" } })
    }

    if (request.method === 'GET' && pathname === 'list') {
      const list = await env.BUCKET.list()
      return Response.json(list.objects.map(obj => obj.key))
    }

    if (request.method === 'GET') {
      const object = await env.BUCKET.get(pathname)
      if (!object) return new Response('Not found', { status: 404 })
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || 'application/octet-stream',
          "content-disposition": \`inline; filename="\${pathname}"\`
        }
      })
    }

    if (request.method === 'POST') {
      const form = await request.formData()
      const file = form.get('file')
      const key = form.get('key')
      if (key !== env.UPLOAD_KEY) {
        return new Response("❌ 上传密码错误", { status: 403 })
      }

      await env.BUCKET.put(file.name, file.stream(), {
        httpMetadata: { contentType: file.type }
      })

      return new Response('✅ 上传成功')
    }

    return new Response('Method Not Allowed', { status: 405 })
  }
}
