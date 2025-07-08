export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/+/, '')
    const accessMap = Object.fromEntries(env.ACCESS_KEYS.split(',').map(pair => {
      const [k, v] = pair.split(':').map(s=>s.trim()); return [k, v]
    }))

    // 获取密码
    let key = url.searchParams.get('key') || ''
    if (request.method === "POST" && path === "whoami") {
      const contentType = request.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const body = await request.json().catch(() => ({}))
        key = body.key || ''
      } else {
        key = await request.text()
      }
      const role = accessMap[key.trim()] || ''
      return new Response(JSON.stringify({ role }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      })
    }

    const role = accessMap[key.trim()] || ''

    if (path === "list" && role) {
      const all = await env.BUCKET.list({ include: ["customMetadata"] })
      const files = all.objects.filter(o => o.customMetadata?.visible !== "false")
      return Response.json(files.map(f => ({ name: f.key, uploader: f.customMetadata?.uploader })))
    }

    if (path === "download" && role) {
      const fn = url.searchParams.get('file')
      const obj = await env.BUCKET.get(fn)
      if (!obj) return new Response("Not Found", { status: 404 })
      return new Response(obj.body, {
        headers: {
          "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
          "content-disposition": `attachment; filename="${fn}"`
        }
      })
    }

    if (path === "upload" && (role === "upload" || role === "admin")) {
      const form = await request.formData()
      const file = form.get("file")
      await env.BUCKET.put(file.name, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { uploader: key, visible: "true" }
      })
      return new Response("✅ 上传成功")
    }

    if (path === "delete" && (role === "admin" || role === "upload")) {
      const fn = url.searchParams.get("file")
      const obj = await env.BUCKET.get(fn, { include: ["customMetadata"] })
      if (!obj) return new Response("文件不存在")
      const owner = obj.customMetadata?.uploader
      if (role === "upload" && owner !== key) return new Response("❌ 无权删除")
      const ts = Date.now()
      await env.BUCKET.put(`__trash__/${fn}__${ts}`, obj.body, {
        customMetadata: { ...obj.customMetadata, deletedAt: ts.toString() }
      })
      await env.BUCKET.delete(fn)
      return new Response("✅ 已移入回收站")
    }

    if (path === "batchdel" && (role === "admin" || role === "upload")) {
      const list = await env.BUCKET.list({ include: ["customMetadata"] })
      const now = Date.now()
      await Promise.all(list.objects.map(async f => {
        const md = f.customMetadata || {}
        if (role === "upload" && md.uploader !== key) return
        const obj = await env.BUCKET.get(f.key)
        await env.BUCKET.put(`__trash__/${f.key}__${now}`, obj.body, {
          customMetadata: { ...md, deletedAt: now.toString() }
        })
        await env.BUCKET.delete(f.key)
      }))
      return new Response("✅ 批量删除完成")
    }

    if (path === "mkdir" && (role === "admin" || role === "upload")) {
      const body = await request.json().catch(()=>({}))
      let name = (body.name || '').trim()
      if (!name) return new Response("❌ 名称不能为空")
      if (!name.endsWith('/')) name += '/'
      await env.BUCKET.put(name, '', {
        customMetadata: { uploader: key, visible: "true" }
      })
      return new Response("✅ 已添加文件夹：" + name)
    }

    if (path === "trash/list" && role === "admin") {
      const trash = await env.BUCKET.list({ prefix: "__trash__/", include: ["customMetadata"] })
      const out = trash.objects.map(o => ({
        name: o.key.replace(/^__trash__\//, ''),
        deletedAt: o.customMetadata?.deletedAt
      }))
      return Response.json(out)
    }

    // 自动清理回收站（7 天）
    const trash = await env.BUCKET.list({ prefix: "__trash__/", include: ["customMetadata"] })
    const now = Date.now()
    for (const o of trash.objects) {
      const t = parseInt(o.customMetadata?.deletedAt || "0")
      if (now - t > 7 * 24 * 3600 * 1000) {
        await env.BUCKET.delete(o.key)
      }
    }

    return new Response("❌ 请求未处理", { status: 405 })
  }
}