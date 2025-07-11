import { createShare, getShare, listShares, cancelShare } from './share.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+/, '');

      let accessMap = {};
      try {
        const configObj = await env.BUCKET.get('__config__/access.json');
        if (configObj) {
          const config = JSON.parse(await configObj.text());
          accessMap = config.accessKeys || {};
        }
      } catch (err) {
        console.error('读取权限配置失败:', err);
        return new Response('权限配置错误', {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      let key = url.searchParams.get('key') || '';
      let role = accessMap[key] || '';

      if (request.method === 'POST' && path === 'whoami') {
        key = (await request.text()).trim();
        role = accessMap[key] || '';
        return jsonResponse({ role });
      }

      if (path === 'list' && role) {
        const list = await env.BUCKET.list({ include: ['customMetadata'] });
        const visibleFiles = list.objects.filter(o =>
          o.customMetadata?.visible !== 'false' &&
          !o.key.startsWith('__config__/') &&
          !o.key.startsWith('__trash__/') &&
          !o.key.startsWith('__share__/')
        );
        return jsonResponse(visibleFiles.map(file => ({
          name: file.key,
          uploader: file.customMetadata?.uploader || 'system',
          size: file.size
        })));
      }

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

      if (path === 'upload' && (role === 'upload' || role === 'admin')) {
        const form = await request.formData();
        const file = form.get('file');
        if (!file) return new Response('未找到文件', { status: 400 });
        await env.BUCKET.put(file.name, file.stream(), {
          httpMetadata: { contentType: file.type },
          customMetadata: { uploader: key, visible: 'true' }
        });
        return new Response('✅ 上传成功', {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

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
        return new Response('✅ 已移入回收站', {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      // ✅ 新增：重命名文件（/rename）
      if (path === 'rename' && (role === 'admin' || role === 'upload')) {
        const { from, to } = await request.json();
        if (!from || !to) return new Response('缺少参数', { status: 400 });

        const file = await env.BUCKET.get(from, { include: ['customMetadata'] });
        if (!file) return new Response('文件不存在', { status: 404 });

        if (role === 'upload' && file.customMetadata?.uploader !== key) {
          return new Response('❌ 无权操作', { status: 403 });
        }

        await env.BUCKET.put(to, file.body, {
          httpMetadata: file.httpMetadata,
          customMetadata: file.customMetadata
        });
        await env.BUCKET.delete(from);
        return new Response('✅ 重命名成功', {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      // 回收站
      if (path === 'trash/list' && role === 'admin') {
        const trash = await env.BUCKET.list({ prefix: '__trash__/', include: ['customMetadata'] });
        return jsonResponse(trash.objects.map(o => ({
          name: o.key.replace(/^__trash__\//, ''),
          deletedAt: o.customMetadata?.deletedAt
        })));
      }

      if (path === 'trash/restore' && role === 'admin') {
        const name = url.searchParams.get('file');
        const file = await env.BUCKET.get(`__trash__/${name}`);
        if (!file) return new Response('文件不存在', { status: 404 });
        const originalName = name.split('__')[0];
        await env.BUCKET.put(originalName, file.body, {
          customMetadata: { ...file.customMetadata, visible: 'true' }
        });
        await env.BUCKET.delete(`__trash__/${name}`);
        return new Response('✅ 已还原', {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (path === 'trash/delete' && role === 'admin') {
        const name = url.searchParams.get('file');
        await env.BUCKET.delete(`__trash__/${name}`);
        return new Response('✅ 彻底删除成功', {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      // 移动文件
      if (path === 'move' && (role === 'admin' || role === 'upload')) {
        const { items, target, key: requestKey } = await request.json();
        if (!Array.isArray(items) || !target || accessMap[requestKey] !== role) {
          return new Response('❌ 参数错误或权限验证失败', {
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' }
          });
        }

        for (const oldKey of items) {
          const obj = await env.BUCKET.get(oldKey, { include: ['customMetadata'] });
          if (!obj) continue;
          if (role === 'upload' && obj.customMetadata?.uploader !== requestKey) continue;

          const fileName = oldKey.split('/').pop();
          const newKey = `${target.replace(/\/+$/, '')}/${fileName}`;
          await env.BUCKET.put(newKey, obj.body, {
            httpMetadata: obj.httpMetadata,
            customMetadata: obj.customMetadata
          });
          await env.BUCKET.delete(oldKey);
        }

        return new Response('✅ 移动成功', {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      // 自动清理回收站
      if (Math.random() < 0.1) {
        const now = Date.now();
        const trash = await env.BUCKET.list({ prefix: '__trash__/' });
        for (const o of trash.objects) {
          const t = parseInt(o.customMetadata?.deletedAt || '0');
          if (now - t > 7 * 24 * 3600 * 1000) await env.BUCKET.delete(o.key);
        }
      }

      return new Response('❌ 未知请求', {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    } catch (err) {
      console.error('错误:', err);
      return new Response(`服务器错误: ${err.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};