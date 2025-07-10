// auth.js
export async function handleAuth(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^auth\/+/, '');

  switch (path) {
    case 'login':
      return handleLogin(request, env, corsHeaders);
    case 'logout':
      return handleLogout(corsHeaders);
    default:
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
  }
}

async function handleLogin(request, env, corsHeaders) {
  const { password } = await request.json();
  
  // 获取配置
  const config = await getConfig(env);
  
  // 检查黑名单
  if (config.blacklist?.includes(password)) {
    return new Response(JSON.stringify({
      error: '该密码已被禁用'
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // 查找用户
  for (const [role, users] of Object.entries(config.accessKeys)) {
    const user = users.find(u => u.password === password);
    if (user) {
      return new Response(JSON.stringify({
        role,
        token: generateToken(password)
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  return new Response(JSON.stringify({
    error: '用户名或密码错误'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

function handleLogout(corsHeaders) {
  return new Response(JSON.stringify({
    message: '登出成功'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'token=; Max-Age=0',
      ...corsHeaders
    }
  });
}

async function getConfig(env) {
  const config = await env.BUCKET.get('__config__/access.json');
  return JSON.parse(await config.text());
}

function generateToken(password) {
  // 实际应用中应该使用更安全的token生成方式
  return btoa(password + ':' + Date.now());
}