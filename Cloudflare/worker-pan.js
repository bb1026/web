import { createShare, getShare, listShares, cancelShare } from './share.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+/, '');

      // load config
      let accessMap = {};
      try {
        const c = await env.BUCKET.get('__config__/access.json');
        if (c) accessMap = JSON.parse(await c.text()).accessKeys || {};
      } catch {
        return new Response('权限配置错误', { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      let key = url.searchParams.get('key') || '';
      let role = accessMap[key] || '';

      // whoami
      if (request.method === 'POST' && path === 'whoami') {
        key = (await request.text()).trim();
        role = accessMap[key] || '';
        return jsonResponse({ role });
      }

      // list files
      if (request.method === 'POST' && path === 'list' && role) {
        const l = await env.BUCKET.list({ include: ['customMetadata'] });
        const arr = l.objects.filter(o =>
          o.customMetadata?.visible !== 'false' &&
          !o.key.startsWith('__config__/') &&
          !o.key.startsWith('__trash__/') &&
          !o.key.startsWith('__share__/')
        ).map(o => ({
          name: o.key,
          uploader: o.customMetadata?.uploader || 'system',
          size: o.size
        }));
        return jsonResponse(arr);
      }

      // download
      if (request.method === 'POST' && path === 'download' && role) {
        const fn = url.searchParams.get('file');
        const file = await env.BUCKET.get(fn);
        if (!file) return new Response('文件不存在', { status: 404 });
        return new Response(file.body, {
          headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fn.split('/').pop())}"`
          }
        });
      }

      // upload
      if (request.method === 'POST' && path === 'upload' && (role === 'upload' || role === 'admin')) {
        const f = (await request.formData()).get('file');
        if (!f) return new Response('未找到文件', { status: 400 });
        await env.BUCKET.put(f.name, f.stream(), {
          httpMetadata: { contentType: f.type },
          customMetadata: { uploader: key, visible: 'true' }
        });
        return new Response('上传成功', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // delete
      if (request.method === 'POST' && path === 'delete' && (role === 'upload' || role === 'admin')) {
        const fn = url.searchParams.get('file');
        const file = await env.BUCKET.get(fn, { include: ['customMetadata'] });
        if (!file) return new Response('文件不存在', { status: 404 });
        if (role === 'upload' && file.customMetadata.uploader !== key) {
          return new Response('无权删除', { status: 403 });
        }
        const ts = Date.now();
        await env.BUCKET.put(`__trash__/${fn}__${ts}`, file.body, {
          customMetadata: { ...file.customMetadata, deletedAt: ts.toString() }
        });
        await env.BUCKET.delete(fn);
        return new Response('已移入回收站', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // mkdir
      if (request.method === 'POST' && path === 'mkdir' && (role === 'upload' || role === 'admin')) {
        const { name } = await request.json().catch(() => ({}));
        if (!name) return new Response('名称不能为空', { status: 400 });
        const dir = name.endsWith('/') ? name : name + '/';
        await env.BUCKET.put(dir, '', {
          customMetadata: { uploader: key, visible: 'true' }
        });
        return new Response(`已创建文件夹：${dir}`, { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // trash/list
      if (request.method === 'POST' && path === 'trash/list' && role === 'admin') {
        const t = await env.BUCKET.list({ prefix: '__trash__/', include: ['customMetadata'] });
        return jsonResponse(t.objects.map(o => ({
          name: o.key.replace(/^__trash__\//, ''),
          deletedAt: o.customMetadata.deletedAt
        })));
      }

      // trash/restore
      if (request.method === 'POST' && path === 'trash/restore' && role === 'admin') {
        const fn = url.searchParams.get('file');
        const f = await env.BUCKET.get(`__trash__/${fn}`);
        if (!f) return new Response('文件不存在', { status: 404 });
        const orig = fn.split('__')[0];
        await env.BUCKET.put(orig, f.body, {
          customMetadata: { ...f.customMetadata, visible: 'true' }
        });
        await env.BUCKET.delete(`__trash__/${fn}`);
        return new Response('已还原', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // trash/delete
      if (request.method === 'POST' && path === 'trash/delete' && role === 'admin') {
        const fn = url.searchParams.get('file');
        await env.BUCKET.delete(`__trash__/${fn}`);
        return new Response('已彻底删除', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // user manage
      if ((request.method === 'POST' || request.method === 'GET') && path === 'auth/manage' && role === 'admin') {
        if (request.method === 'GET') {
          const users = Object.entries(accessMap).map(([k, r]) => ({ key: k, role: r }));
          return jsonResponse({ users });
        }
        const { action, user, key: adminKey } = await request.json();
        if (accessMap[adminKey] !== 'admin') return new Response('验证失败', { status: 403 });
        if (action === 'add') accessMap[user.key] = user.role;
        if (action === 'delete') delete accessMap[user.key];
        await env.BUCKET.put('__config__/access.json', JSON.stringify({ accessKeys: accessMap }));
        return new Response('操作成功', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      // share APIs
      if (request.method === 'POST' && path === 'share/create') return createShare(request, env);
      if (request.method === 'POST' && path === 'share/get') return getShare(request, env);
      if (request.method === 'POST' && path === 'share/list') return listShares(request, env);
      if (request.method === 'POST' && path === 'share/cancel') return cancelShare(request, env);

      return new Response(`未知请求 path=${path} method=${request.method}`, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (e) {
      console.error(e);
      return new Response(`服务器错误: ${e.message}`, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }
};