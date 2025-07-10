// auth.js
import { corsHeaders, verifyAuth, getConfig, jsonResponse } from './utils.js';

export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^auth\/+/, '');

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  switch (path) {
    case 'login':
      return handleLogin(request, env);
    default:
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
  }
}

async function handleLogin(request, env) {
  try {
    const { password } = await request.json();
    const config = await getConfig(env);
    
    // 检查黑名单
    if (config.blacklist?.includes(password)) {
      return jsonResponse({ error: '该密码已被禁用' }, 403);
    }

    // 查找用户
    for (const [role, users] of Object.entries(config.accessKeys)) {
      const user = users.find(u => u.password === password);
      if (user) {
        return jsonResponse({ 
          role,
          token: password // 实际项目应使用JWT等安全token
        });
      }
    }

    return jsonResponse({ error: '用户名或密码错误' }, 401);
  } catch (e) {
    return jsonResponse({ error: '无效请求' }, 400);
  }
}