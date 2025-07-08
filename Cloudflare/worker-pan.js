export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+/, '');

      // === 权限配置：从 R2 读取 __config__/access.json ===
      let accessMap = {};
      try {
        const configObj = await env.BUCKET.get('__config__/access.json');
        if (configObj) {
          const config = JSON.parse(await configObj.text());
          accessMap = config.accessKeys || {}; // 格式：{ "密钥": "角色" }
        }
      } catch (err) {
        console.error('读取权限配置失败:', err);
        return new Response('权限配置错误', { status: 500 });
      }

      // 解析请求中的密钥
      let key = url.searchParams.get('key') || '';
      let role = accessMap[key] || '';

      // === 1. 身份验证接口 ===
      if (request.method === 'POST' && path === 'whoami') {
        key = (await request.text()).trim();
        role = accessMap[key] || '';
        return new Response(JSON.stringify({ role }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // === 2. 文件操作接口 ===
      // 2.1 列出文件
      if (path === 'list' && role) {
        const list = await env.BUCKET.list({ include: ['customMetadata'] });
        const visibleFiles = list.objects.filter(o => 
          o.customMetadata?.visible !== 'false' &&
          !o.key.startsWith('__config__/') &&
          !o.key.startsWith('__trash__/') &&
          !o.key.startsWith('__share__/')
        );
        return Response.json(visibleFiles.map(file => ({
          name: file.key,
          uploader: file.customMetadata?.uploader || 'system',
          size: file.size
        })));
      }

      // 2.2 下载文件
      if (path === 'download' && role) {
        const fileName = url.searchParams.get('file');
        const file = await env.BUCKET.get(fileName);
        if (!file) return new Response('文件不存在', { status: 404 });
        return new Response(file.body, {
          headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName.split('/').pop())}"`
          }
        });
      }

      // 2.3 上传文件
      if (path === 'upload' && (role === 'upload' || role === 'admin')) {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) return new Response('未找到文件', { status: 400 });
        await env.BUCKET.put(file.name, file.stream(), {
          httpMetadata: { contentType: file.type },
          customMetadata: { uploader: key, visible: 'true' }
        });
        return new Response('✅ 上传成功');
      }

      // 2.4 删除文件
      if (path === 'delete' && (role === 'admin' || role === 'upload')) {
        const fileName = url.searchParams.get('file');
        const file = await env.BUCKET.get(fileName, { include: ['customMetadata'] });
        if (!file) return new Response('文件不存在', { status: 404 });
        if (role === 'upload' && file.customMetadata?.uploader !== key) {
          return new Response('❌ 无权删除', { status: 403 });
        }
        const ts = Date.now();
        await env.BUCKET.put(`__trash__/${fileName}__${ts}`, file.body, {
          customMetadata: { ...file.customMetadata, deletedAt: ts.toString() }
        });
        await env.BUCKET.delete(fileName);
        return new Response('✅ 已移入回收站');
      }

      // 2.5 新建文件夹
      if (path === 'mkdir' && (role === 'admin' || role === 'upload')) {
        const body = await request.json().catch(() => ({}));
        let name = (body.name || '').trim();
        if (!name) return new Response('❌ 名称不能为空');
        if (!name.endsWith('/')) name += '/';
        await env.BUCKET.put(name, '', {
          customMetadata: { uploader: key, visible: 'true' }
        });
        return new Response(`✅ 已添加文件夹：${name}`);
      }

      // === 3. 回收站接口 ===
      // 3.1 列出回收站
      if (path === 'trash/list' && role === 'admin') {
        const trash = await env.BUCKET.list({ prefix: '__trash__/', include: ['customMetadata'] });
        return Response.json(trash.objects.map(o => ({
          name: o.key.replace(/^__trash__\//, ''),
          deletedAt: o.customMetadata?.deletedAt
        })));
      }

      // 3.2 还原文件
      if (path === 'trash/restore' && role === 'admin') {
        const name = url.searchParams.get('file');
        const file = await env.BUCKET.get(`__trash__/${name}`);
        if (!file) return new Response('文件不存在', { status: 404 });
        const originalName = name.split('__')[0];
        await env.BUCKET.put(originalName, file.body, {
          customMetadata: { ...file.customMetadata, visible: 'true' }
        });
        await env.BUCKET.delete(`__trash__/${name}`);
        return new Response('✅ 已还原');
      }

      // 3.3 彻底删除
      if (path === 'trash/delete' && role === 'admin') {
        const name = url.searchParams.get('file');
        await env.BUCKET.delete(`__trash__/${name}`);
        return new Response('✅ 彻底删除成功');
      }

      // === 4. 用户管理接口（仅 admin 可用） ===
      if (path === 'auth/manage') {
        if (role !== 'admin') return new Response('无权限', { status: 403 });

        // 4.1 获取用户列表
        if (request.method === 'GET') {
          const users = Object.entries(accessMap).map(([key, role]) => ({ key, role }));
          return Response.json({ users });
        }

        // 4.2 添加/删除用户
        if (request.method === 'POST') {
          const { action, user, key: adminKey } = await request.json();
          if (accessMap[adminKey] !== 'admin') return new Response('验证失败', { status: 403 });

          // 更新配置
          if (action === 'add') accessMap[user.key] = user.role;
          if (action === 'delete') delete accessMap[user.key];

          // 保存到 R2
          await env.BUCKET.put('__config__/access.json', JSON.stringify({ accessKeys: accessMap }));
          return new Response('操作成功');
        }
      }

      // === 5. 自动清理 ===
      if (Math.random() < 0.1) {
        const now = Date.now();
        // 清理7天前的回收站文件
        const trash = await env.BUCKET.list({ prefix: '__trash__/' });
        for (const o of trash.objects) {
          const t = parseInt(o.customMetadata?.deletedAt || '0');
          if (now - t > 7 * 24 * 3600 * 1000) await env.BUCKET.delete(o.key);
        }
      }

      return new Response('❌ 未知请求', { status: 404 });
    } catch (err) {
      console.error('错误:', err);
      return new Response(`服务器错误: ${err.message}`, { status: 500 });
    }
  }
};