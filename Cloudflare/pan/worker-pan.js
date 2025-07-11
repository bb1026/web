import { handleAuth } from './auth.js';
import { handleFileOps } from './files.js';
import { handleTrash } from './trash.js';
import { handleUserManage } from './users.js';
import { handleShare } from './sharing.js';
import { jsonResponse, corsOptions } from './utils.js';

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+/, '');
      const method = request.method;

      // 全局权限读取
      const configObj = await env.BUCKET.get('__config__/access.json');
      const accessMap = configObj ? (JSON.parse(await configObj.text())).accessKeys || {} : {};
      const key = url.searchParams.get('key') || '';
      const role = accessMap[key] || '';

      // OPTIONS 预检
      if (method === 'OPTIONS') return corsOptions();

      // 分发
      if (path === 'whoami') return handleAuth(request, accessMap);
      if (path.startsWith('trash/')) return handleTrash(path, request, env, key, role, accessMap);
      if (path.startsWith('auth/')) return handleUserManage(path, request, env, role, accessMap);
      if (path.startsWith('share/')) return handleShare(path, request, env, key, role, accessMap);
      return await handleFileOps(path, request, env, key, role, accessMap);

    } catch (err) {
      console.error('错误:', err);
      return new Response(`服务器错误: ${err.message}`, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};