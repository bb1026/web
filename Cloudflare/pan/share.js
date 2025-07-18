function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function genId() {
  return crypto.randomUUID();
}

function genPassword(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, '');
    const method = request.method;

    // ✅ 处理预检请求
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // ✅ 创建分享
    if (path === 'share/create' && method === 'POST') {
      try {
        const body = await request.json();
        const { file, passwordType = 'none', customPassword = '', expiresIn = '7d', key } = body;

        if (!file) return jsonResponse({ error: '缺少文件参数' }, 400);
        if (!key || typeof key !== 'string') return jsonResponse({ error: '未登录或 key 缺失' }, 401);

        const id = genId();
        let password = '';
        if (passwordType === 'random') password = genPassword();
        else if (passwordType === 'custom') password = customPassword;

        const now = Date.now();
        const expiresMap = { '1d': 1, '3d': 3, '7d': 7, 'forever': 3650 };
        const days = expiresMap[expiresIn] || 7;
        const expiresAt = now + days * 24 * 3600 * 1000;

        const record = {
          id,
          file,
          key,
          password,
          passwordType,
          expiresAt,
          createdAt: now
        };

        await env.BUCKET.put(`__share__/${id}`, JSON.stringify(record));

        return jsonResponse({
          id,
          link: `https://www.0515364.xyz/pan/share.html?id=${id}`,
          password: password || undefined,
          passwordType,
          expiresAt
        });
      } catch (e) {
        return jsonResponse({ error: `系统内部错误：${e.message}` }, 500);
      }
    }

    // ✅ 获取分享
    if (path === 'share/get' && method === 'GET') {
      const id = url.searchParams.get('id');
      const password = url.searchParams.get('password') || '';

      if (!id) return jsonResponse({ error: '缺少分享ID' }, 400);

      const obj = await env.BUCKET.get(`__share__/${id}`);
      if (!obj) return jsonResponse({ error: '分享不存在' }, 404);

      const data = JSON.parse(await obj.text());
      if (Date.now() > data.expiresAt) return jsonResponse({ error: '分享已过期' }, 410);
      if (data.password && data.password !== password) return jsonResponse({ error: '密码错误' }, 403);

      return jsonResponse({
        file: data.file,
        password: data.password || undefined,
        expiresAt: data.expiresAt,
        passwordType: data.passwordType || 'none'
      });
    }

    // ✅ 获取某个 key 的所有分享
    if (path === 'share/list' && method === 'GET') {
      const key = url.searchParams.get('key');
      if (!key) return jsonResponse({ error: '缺少 key 参数' }, 400);

      const shares = [];

      const list = await env.BUCKET.list({ prefix: '__share__/' });
      for (const item of list.objects) {
        const obj = await env.BUCKET.get(item.key);
        if (!obj) continue;

        try {
          const data = JSON.parse(await obj.text());
          if (data.key === key) {
            shares.push({
              id: data.id,
              file: data.file,
              password: data.password || '',
              passwordType: data.passwordType || 'none',
              expiresAt: data.expiresAt,
              link: `https://www.0515364.xyz/pan/share.html?id=${data.id}`
            });
          }
        } catch {
          // 跳过解析失败项
        }
      }

      return jsonResponse(shares);
    }

    // ✅ 取消分享
    if (path === 'share/cancel' && method === 'POST') {
      try {
        const { id } = await request.json();
        if (!id) return jsonResponse({ error: '缺少分享ID' }, 400);

        await env.BUCKET.delete(`__share__/${id}`);
        return jsonResponse({ message: '✅ 已取消分享' });
      } catch (e) {
        return jsonResponse({ error: `取消失败：${e.message}` }, 500);
      }
    }

    // ✅ 修改分享（密码 / 有效期）
    if (path === 'share/update' && method === 'POST') {
      try {
        const { id, password, passwordType, expiresIn } = await request.json();
        if (!id) return jsonResponse({ error: '缺少分享ID' }, 400);

        const obj = await env.BUCKET.get(`__share__/${id}`);
        if (!obj) return jsonResponse({ error: '分享不存在' }, 404);

        const data = JSON.parse(await obj.text());

        if (password !== undefined) data.password = password;
        if (passwordType !== undefined) data.passwordType = passwordType;
        if (expiresIn) {
          const expiresMap = { '1d': 1, '3d': 3, '7d': 7, 'forever': 3650 };
          const days = expiresMap[expiresIn] || 7;
          data.expiresAt = Date.now() + days * 24 * 3600 * 1000;
        }

        await env.BUCKET.put(`__share__/${id}`, JSON.stringify(data));

        return jsonResponse({ message: '✅ 分享已更新' });
      } catch (e) {
        return jsonResponse({ error: `更新失败：${e.message}` }, 500);
      }
    }

    // ❌ 未知路径
    return new Response('❌ 无效分享请求', {
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain'
      }
    });
  }
};