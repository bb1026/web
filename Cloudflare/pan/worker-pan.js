import { handleAuth } from './auth.js';
import { handleFileOps } from './files.js';
import { handleTrash } from './trash.js';
import { handleUserManage } from './users.js';
import { handleShare } from './sharing.js';
import { detectRoleFromPassword, jsonResponse, corsOptions } from './utils.js';

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+/, '');
      const method = request.method;

      // 加载 access.json
      const configObj = await env.BUCKET.get('__config__/access.json');
      const fullConfig = configObj ? JSON.parse(await configObj.text()) : {};
      const accessMap = fullConfig.accessKeys || {};
      const blacklist = fullConfig.blacklist || [];

      // OPTIONS 预检
      if (method === 'OPTIONS') return corsOptions();

      // 获取 key（用户输入的密码）
      const key = url.searchParams.get('key') || '';
      const { role, remark } = detectRoleFromPassword(accessMap, key);

      // 分发各个接口
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