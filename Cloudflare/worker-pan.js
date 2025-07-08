export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/+/, '')
    const accessMap = Object.fromEntries(env.ACCESS_KEYS.split(',').map(pair => {
      const [k, v] = pair.split(':').map(s=>s.trim()); return [k, v]
    }))
    const key = (request.method === "POST") ? await request.text().catch(_ => '') : url.searchParams.get('key') || ''
    const role = accessMap[key] || ''

    if (path === "whoami" && request.method === "POST") {
      return Response.json({ role })
    }

    if (path === "list" && request.method === "GET" && role) {
      const all = await env.BUCKET.list({ include: ["customMetadata"] })
      const visible = all.objects.filter(o => o.customMetadata?.visible !== "false")
      const data = visible.map(o=>({
        name: o.key, uploader: o.customMetadata?.uploader
      }))
      return Response.json(data)
    }

    if (path === "download" && request.method === "GET" && role) {
      const fn = url.searchParams.get('file')
      const obj = await env.BUCKET.get(fn)
      if (!obj) return new Response("Not found", { status: 404 })
      return new Response(obj.body, {
        headers: { "content-type": obj.httpMetadata?.contentType, "content-disposition": `attachment; filename="${fn}"` }
      })
    }

    if (path === "upload" && request.method === "POST" && (role === "upload" || role==="admin")) {
      const form = await request.formData()
      const file = form.get('file')
      await env.BUCKET.put(file.name, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { uploader: key, visible: "true" }
      })
      return new Response("✅ 上传成功")
    }

    if (path === "delete" && request.method === "GET" && (role==="admin" || role==="upload")) {
      const fn = url.searchParams.get('file')
      const obj = await env.BUCKET.get(fn, { include: ["customMetadata"] })
      if (!obj) return new Response("Not found", { status: 404 })
      const owner = obj.customMetadata?.uploader
      if (role==="upload" && owner !== key) return new Response("❌ 无权限删除该文件", { status: 403 })
      const ts = Date.now().toString()
      await env.BUCKET.put(`__trash__/${fn}__${ts}`, obj.body, { customMetadata: { ...obj.customMetadata, deletedAt: ts } })
      await env.BUCKET.delete(fn)
      return new Response("✅ 删除成功，已移入回收站")
    }

    if (path === "batchdel" && request.method === "POST" && (role==="admin"||role==="upload")) {
      const list = await env.BUCKET.list({ include: ["customMetadata"] })
      const tasks = list.objects.map(async o => {
        const md = o.customMetadata || {}
        if (role==="upload" && md.uploader !== key) return
        const ts = Date.now().toString()
        const obj = await env.BUCKET.get(o.key)
        await env.BUCKET.put(`__trash__/${o.key}__${ts}`, obj.body, { customMetadata: { ...md, deletedAt: ts } })
        await env.BUCKET.delete(o.key)
      })
      await Promise.all(tasks)
      return new Response("✅ 批量删除完成")
    }

    if (path === "mkdir" && request.method === "POST" && (role==="admin"||role==="upload")) {
      let { name } = await request.json()
      if (!name) return new Response("名称不能为空", { status: 400 })
      if (!name.endsWith('/')) name += '/'
      await env.BUCKET.put(name, '', { customMetadata: { uploader:key, visible:"true" } })
      return new Response("✅ 已新建：" + name)
    }

    if (path === "trash/list" && request.method === "GET" && role==="admin") {
      const list = await env.BUCKET.list({ prefix: "__trash__/", include:["customMetadata"] })
      const out = list.objects.map(o => ({
        name: o.key.replace(/^__trash__\//,''), deletedAt: o.customMetadata?.deletedAt
      }))
      return Response.json(out)
    }

    // 自动回收策略（每次访问触发，也可定时）
    const allTrash = await env.BUCKET.list({ prefix:"__trash__/", include:["customMetadata"] })
    const now = Date.now()
    for (const o of allTrash.objects) {
      const ts = parseInt(o.customMetadata?.deletedAt || 0)
      if (now - ts > 7*24*3600*1000) {
        await env.BUCKET.delete(o.key)
      }
    }

    return new Response("❌ 不支持该请求", { status: 405 })
  }
}