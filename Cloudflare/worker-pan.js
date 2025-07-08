export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const pathname = decodeURIComponent(url.pathname.slice(1))

    // 工具：解析权限映射
    function parseAccessKeys(str) {
      return str.split(",").reduce((acc, pair) => {
        const [key, role] = pair.split(":").map(s => s.trim())
        acc[key] = role
        return acc
      }, {})
    }

    const accessMap = parseAccessKeys(env.ACCESS_KEYS)
    const method = request.method

    // 首页：上传 + 文件列表页面
    if (method === 'GET' && pathname === '') {
      return new Response(`
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>
          <h2>📁 网盘 - pan.0515364.xyz</h2>
          <form method="POST" enctype="multipart/form-data">
            <input type="file" name="file" /><br/><br/>
            <input type="password" name="key" placeholder="访问密码" />
            <button type="submit">上传</button>
          </form>
          <hr/>
          <ul id="list">加载中...</ul>
          <script>
            const urlParams = new URLSearchParams(location.search)
            const key = urlParams.get("key") || ""
            fetch('/list?key=' + key)
              .then(r => r.json())
              .then(data => {
                list.innerHTML = data.map(f => 
                  \`<li>\${f} <a href="/\${f}?key=\${key}" target="_blank">下载</a> \${key && f ? '[<a href="/delete?file=' + f + '&key=' + key + '">删除</a>]' : ''}</li>\`
                ).join('')
              })
          </script>
        </body></html>
      `, { headers: { "content-type": "text/html; charset=utf-8" } })
    }

    // 文件列表接口
    if (method === 'GET' && pathname === 'list') {
      const key = url.searchParams.get('key') || ''
      const role = accessMap[key]
      if (!role) return Response.json([])

      const list = await env.BUCKET.list()
      return Response.json(list.objects.map(obj => obj.key))
    }

    // 文件下载
    if (method === 'GET' && pathname && pathname !== 'delete' && pathname !== 'list') {
      const key = url.searchParams.get('key') || ''
      const role = accessMap[key]
      if (!role) return new Response("❌ 没有下载权限", { status: 403 })

      const object = await env.BUCKET.get(pathname)
      if (!object) return new Response('Not found', { status: 404 })

      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || 'application/octet-stream',
          "content-disposition": \`inline; filename="\${pathname}"\`
        }
      })
    }

    // 上传接口
    if (method === 'POST') {
      const form = await request.formData()
      const file = form.get('file')
      const key = form.get('key') || ''
      const role = accessMap[key]

      if (!role || (role !== 'upload' && role !== 'admin')) {
        return new Response("❌ 没有上传权限", { status: 403 })
      }

      await env.BUCKET.put(file.name, file.stream(), {
        httpMetadata: { contentType: file.type }
      })

      return new Response("✅ 上传成功")
    }

    // 删除接口（只限 admin）
    if (method === 'GET' && pathname === 'delete') {
      const filename = url.searchParams.get('file')
      const key = url.searchParams.get('key') || ''
      const role = accessMap[key]

      if (role !== 'admin') {
        return new Response("❌ 没有删除权限", { status: 403 })
      }

      await env.BUCKET.delete(filename)
      return new Response("✅ 已删除：" + filename)
    }

    return new Response('❌ 不支持的请求', { status: 405 })
  }
}