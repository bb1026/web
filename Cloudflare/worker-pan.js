export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/+/, '')

    // 权限解析
    const accessMap = Object.fromEntries(env.ACCESS_KEYS.split(',').map(p => {
      const [k, v] = p.trim().split(':'); return [k, v]
    }))
    let key = url.searchParams.get('key') || ''
    let role = accessMap[key] || ''

    // whoami
    if (request.method === "POST" && path === "whoami") {
      key = await request.text()
      role = accessMap[key.trim()] || ''
      return new Response(JSON.stringify({ role }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      })
    }

    // === 文件功能 ===
    if (path === "list" && role) {
      const list = await env.BUCKET.list({ include: ["customMetadata"] })
      const visible = list.objects.filter(o => o.customMetadata?.visible !== "false")
      return Response.json(visible.map(f => ({
        name: f.key,
        uploader: f.customMetadata?.uploader
      })))
    }

    if (path === "download" && role) {
      const fn = url.searchParams.get('file')
      const obj = await env.BUCKET.get(fn)
      if (!obj) return new Response("Not Found", { status: 404 })
      return new Response(obj.body, {
        headers: {
          "content-type": obj.httpMetadata?.contentType || "application/octet-stream",
          "content-disposition": `attachment; filename="${fn.split('/').pop()}"`
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

    // === 分享功能 ===

    // 生成分享
    if (path === "share/create" && request.method === "POST" && (role === "admin" || role === "upload")) {
      const { name, password, duration } = await request.json()
      if (!password) return Response.json({ error: "密码不能为空" })
      const shareId = crypto.randomUUID().slice(0, 8)
      const expiresAt = duration > 0 ? Date.now() + duration * 60000 : 0

      let files = []
      if (name.endsWith("/")) {
        const list = await env.BUCKET.list({ prefix: name })
        files = list.objects.map(o => ({ key: o.key, name: o.key }))
      } else {
        const obj = await env.BUCKET.head(name)
        if (!obj) return Response.json({ error: "文件不存在" })
        files = [{ key: name, name }]
      }

      const meta = { id: shareId, password, expiresAt, files, name }
      await env.BUCKET.put(`__share__/${shareId}`, JSON.stringify(meta), {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { owner: key }
      })
      return Response.json({ id: shareId })
    }

    // 访问分享
    if (path.startsWith("share/") && request.method === "POST") {
      const id = path.split("/")[1]
      const obj = await env.BUCKET.get(`__share__/${id}`)
      if (!obj) return Response.json({ error: "分享不存在" })
      const data = JSON.parse(await obj.text())
      const { password } = await request.json()
      if (data.expiresAt && Date.now() > data.expiresAt)
        return Response.json({ error: "分享已过期" })
      if (data.password !== password)
        return Response.json({ error: "密码错误" })
      return Response.json({
        name: data.name,
        files: data.files,
        accessToken: "read456" // 临时 token（实际中可替换为 jwt）
      })
    }

    // 查看我分享的文件
    if (path === "share/list" && role) {
      const list = await env.BUCKET.list({ prefix: "__share__/", include: ["customMetadata"] })
      const userShares = list.objects.filter(o => o.customMetadata?.owner === key)
      const shares = await Promise.all(userShares.map(async s => {
        const obj = await env.BUCKET.get(s.key)
        const meta = JSON.parse(await obj.text())
        return {
          id: meta.id,
          name: meta.name,
          password: meta.password,
          expiresAt: meta.expiresAt
        }
      }))
      return Response.json(shares)
    }

    // 取消分享
    if (path === "share/cancel" && role) {
      const id = url.searchParams.get("id")
      const obj = await env.BUCKET.get(`__share__/${id}`, { include: ["customMetadata"] })
      if (!obj) return new Response("分享不存在")
      const owner = obj.customMetadata?.owner
      if (owner !== key && role !== "admin") return new Response("❌ 无权取消")
      await env.BUCKET.delete(`__share__/${id}`)
      return new Response("✅ 分享已取消")
    }

    // === 自动清理回收站 + 过期分享 ===
    {
      const trash = await env.BUCKET.list({ prefix: "__trash__/", include: ["customMetadata"] })
      const now = Date.now()
      for (const o of trash.objects) {
        const t = parseInt(o.customMetadata?.deletedAt || "0")
        if (now - t > 7 * 24 * 3600 * 1000) {
          await env.BUCKET.delete(o.key)
        }
      }

      const shares = await env.BUCKET.list({ prefix: "__share__/" })
      for (const o of shares.objects) {
        const obj = await env.BUCKET.get(o.key)
        const meta = JSON.parse(await obj.text().catch(() => "{}"))
        if (meta.expiresAt && now > meta.expiresAt) {
          await env.BUCKET.delete(o.key)
        }
      }
    }

    return new Response("❌ 未知请求", { status: 404 })
  }
}