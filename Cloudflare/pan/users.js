import { jsonResponse } from './utils.js';

export async function handleUserManage(path, request, env, role, accessMap) {
  if (path === 'auth/manage') {
    if (role !== 'admin') return new Response('无权限', { status: 403 });

    if (request.method === 'GET') {
      const users = Object.entries(accessMap).map(([key, role]) => ({ key, role }));
      return jsonResponse({ users });
    }

    if (request.method === 'POST') {
      const { action, user, key: adminKey } = await request.json();
      if (accessMap[adminKey] !== 'admin') return new Response('验证失败', { status: 403 });

      if (action === 'add') accessMap[user.key] = user.role;
      if (action === 'delete') delete accessMap[user.key];

      await env.BUCKET.put('__config__/access.json', JSON.stringify({ accessKeys: accessMap }));
      return new Response('操作成功', {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  return new Response('未知用户操作', { status: 404 });
}