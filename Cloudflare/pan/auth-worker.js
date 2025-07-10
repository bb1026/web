// auth-worker.js
export default {
  async fetch(request, env) {
    // 设置CORS头部
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 只处理POST请求
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: corsHeaders });
    }

    try {
      // 1. 读取权限配置
      const configObj = await env.BUCKET.get('__config__/access.json');
      if (!configObj) {
        return new Response(null, { status: 500, headers: corsHeaders });
      }
      const { accessKeys, blacklist } = JSON.parse(await configObj.text());

      // 2. 获取请求中的密码
      const { password } = await request.json();
      if (!password) {
        return new Response(null, { status: 400, headers: corsHeaders });
      }

      // 3. 检查黑名单
      if (blacklist?.includes(password)) {
        return new Response('denied', { 
          status: 403,
          headers: corsHeaders
        });
      }

      // 4. 查找密码对应的权限
      for (const [role, users] of Object.entries(accessKeys)) {
        if (users.some(u => u.password === password)) {
          return new Response(role, { headers: corsHeaders });
        }
      }

      // 5. 密码未找到
      return new Response('denied', { 
        status: 401,
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('验证出错:', error);
      return new Response(null, { 
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
