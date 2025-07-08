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
          accessMap = config.accessKeys || {}; // 格式：{ "密钥": "角色", ... }
        }
      } catch (err) {
        console.error('读取权限配置失败:', err);
        return new Response('权限配置错误', { status: 500 });
      }

      // 解析请求中的密钥（URL 参数或请求体）
      let key = url.searchParams.get('key') || '';
      let role = accessMap[key] || '';

      // === 核心接口：身份验证 ===
      if (request.method === 'POST' && path === 'whoami') {
        key = (await request.text()).trim();
        role = accessMap[key] || '';
        return new Response(JSON.stringify({ role }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // === 文件操作：列表 ===
      if (path === 'list' && role) {
        const list = await env.BUCKET.list({ include: ['customMetadata'] });
        const visibleFiles = list.objects.filter(
          o => o.customMetadata?.visible !== 'false' && 
               !o.key.startsWith('__config__/') &&  // 隐藏配置文件
               !o.key.startsWith('__trash__/') &&   // 隐藏回收站
               !o.key.startsWith('__share__/')      // 隐藏分享元数据
        );
        return Response.json(visibleFiles.map(file => ({
          name: file.key,
          uploader: file.customMetadata?.uploader || 'system',
          size: file.size,
          modified: file.uploaded
        })));
      }

      // === 文件操作：下载 ===
      if (path === 'download' && role) {
        const fileName = url.searchParams.get('file');
        if (!fileName) return new Response('缺少文件名', { status: 400 });
        const file = await env.BUCKET.get(fileName);
        if (!file) return new Response('文件不存在', { status: 404 });
        return new Response(file.body, {
          headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName.split('/').pop())}"`
          }
        });
      }

      // === 文件操作：上传（仅 upload/admin 角色） ===
      if (path === 'upload' && (role === 'upload' || role === 'admin')) {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) return new Response('未找到文件', { status: 400 });

        // 上传文件到 R2，记录上传者和可见性
        await env.BUCKET.put(file.name, file.stream(), {
          httpMetadata: { contentType: file.type },
          customMetadata: {
            uploader: key,
            visible: 'true',
            uploadedAt: Date.now().toString()
          }
        });
        return new Response('✅ 上传成功');
      }

      // === 文件操作：删除（支持权限校验） ===
      if (path === 'delete' && (role === 'admin' || role === 'upload')) {
        const fileName = url.searchParams.get('file');
        if (!fileName) return new Response('缺少文件名', { status: 400 });

        const file = await env.BUCKET.get(fileName, { include: ['customMetadata'] });
        if (!file) return new Response('文件不存在', { status: 404 });

        // 权限校验：普通用户只能删除自己的文件
        const owner = file.customMetadata?.uploader;
        if (role === 'upload' && owner !== key) {
          return new Response('❌ 无权删除他人文件', { status: 403 });
        }

        // 移动到回收站（保留7天）
        const ts = Date.now();
        await env.BUCKET.put(
          `__trash__/${fileName}__${ts}`,
          file.body,
          { customMetadata: { ...file.customMetadata, deletedAt: ts.toString() } }
        );
        await env.BUCKET.delete(fileName);
        return new Response('✅ 已移入回收站');
      }

      // === 回收站：列表（仅 admin 角色） ===
      if (path === 'trash/list' && role === 'admin') {
        const trashList = await env.BUCKET.list({ prefix: '__trash__/', include: ['customMetadata'] });
        return Response.json(trashList.objects.map(file => ({
          name: file.key.replace(/^__trash__\//, ''),
          deletedAt: file.customMetadata?.deletedAt,
          originalName: file.key.split('__')[0].replace('__trash__/', '')
        })));
      }

      // === 回收站：还原（仅 admin 角色） ===
      if (path === 'trash/restore' && role === 'admin') {
        const trashName = url.searchParams.get('file');
        if (!trashName) return new Response('缺少文件名', { status: 400 });

        const fullPath = `__trash__/${trashName}`;
        const file = await env.BUCKET.get(fullPath);
        if (!file) return new Response('回收站文件不存在', { status: 404 });

        // 还原到原始路径
        const originalName = trashName.split('__')[0];
        await env.BUCKET.put(originalName, file.body, {
          customMetadata: { ...file.customMetadata, visible: 'true' }
        });
        await env.BUCKET.delete(fullPath);
        return new Response('✅ 已还原');
      }

      // === 分享功能：创建分享（仅 upload/admin 角色） ===
      if (path === 'share/create' && request.method === 'POST' && (role === 'upload' || role === 'admin')) {
        const { name: fileName, password, duration } = await request.json();
        if (!password) return Response.json({ error: '密码不能为空' }, { status: 400 });

        // 验证文件/文件夹是否存在
        let files = [];
        if (fileName.endsWith('/')) {
          // 文件夹：列出所有子文件
          const list = await env.BUCKET.list({ prefix: fileName });
          files = list.objects.map(o => ({ key: o.key, name: o.key }));
        } else {
          // 单个文件：验证存在性
          const file = await env.BUCKET.head(fileName);
          if (!file) return Response.json({ error: '文件不存在' }, { status: 404 });
          files = [{ key: fileName, name: fileName }];
        }

        // 生成分享 ID 和元数据
        const shareId = (Math.random().toString(36).substring(2, 10) + Date.now()).slice(0, 8);
        const expiresAt = duration > 0 ? Date.now() + duration * 60000 : 0; // 有效期（分钟）
        const meta = { id: shareId, password, expiresAt, files, name: fileName };

        // 保存分享元数据到 R2
        await env.BUCKET.put(
          `__share__/${shareId}`,
          JSON.stringify(meta),
          {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: { owner: key }
          }
        );
        return Response.json({ id: shareId });
      }

      // === 分享功能：访问分享 ===
      if (path.startsWith('share/') && request.method === 'POST') {
        const shareId = path.split('/')[1];
        const shareMetaObj = await env.BUCKET.get(`__share__/${shareId}`);
        if (!shareMetaObj) return Response.json({ error: '分享不存在' }, { status: 404 });

        const { password } = await request.json();
        const meta = JSON.parse(await shareMetaObj.text());

        // 验证有效期和密码
        if (meta.expiresAt && Date.now() > meta.expiresAt) {
          return Response.json({ error: '分享已过期' }, { status: 403 });
        }
        if (meta.password !== password) {
          return Response.json({ error: '密码错误' }, { status: 403 });
        }

        return Response.json({
          name: meta.name,
          files: meta.files,
          accessToken: 'read_only_token' // 实际场景可替换为 JWT
        });
      }

      // === 自动清理：7天前的回收站文件和过期分享 ===
      if (Math.random() < 0.1) { // 10% 概率触发，避免每次请求执行
        const now = Date.now();
        // 清理回收站（7天前）
        const trash = await env.BUCKET.list({ prefix: '__trash__/' });
        for (const file of trash.objects) {
          const delTime = parseInt(file.customMetadata?.deletedAt || '0');
          if (now - delTime > 7 * 24 * 3600 * 1000) {
            await env.BUCKET.delete(file.key);
          }
        }
        // 清理过期分享
        const shares = await env.BUCKET.list({ prefix: '__share__/' });
        for (const share of shares.objects) {
          const metaObj = await env.BUCKET.get(share.key);
          if (!metaObj) continue;
          const meta = JSON.parse(await metaObj.text().catch(() => '{}'));
          if (meta.expiresAt && now > meta.expiresAt) {
            await env.BUCKET.delete(share.key);
          }
        }
      }

      // 未匹配的路径
      return new Response('❌ 未知请求', { status: 404 });
    } catch (err) {
      console.error('执行错误:', err);
      return new Response(`服务器错误: ${err.message}`, { status: 500 });
    }
  }
};