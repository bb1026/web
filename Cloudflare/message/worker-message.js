const ipCache = new Map();

export default {
  async fetch(request, env) {
    const bucket = env.BUCKET;
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const list = await bucket.list();
      const messages = [];

      for (const obj of list.objects) {
        const res = await bucket.get(obj.key);
        if (res) {
          const text = await res.text();
          try {
            const item = JSON.parse(text);
            item._key = obj.key;
            messages.push(item);
          } catch (_) {}
        }
      }

      messages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const start = (page - 1) * limit;
      const end = start + limit;

      return jsonResponse({
        total: messages.length,
        page,
        limit,
        messages: messages.slice(start, end)
      });
    }

    if (request.method === 'POST') {
      const now = Date.now();
      const recent = ipCache.get(clientIP) || [];
      const filtered = recent.filter(ts => now - ts < 60000);
      if (filtered.length >= 5) return new Response('Too Many Requests', { status: 429 });
      filtered.push(now);
      ipCache.set(clientIP, filtered);

      const data = await request.json().catch(() => null);
      if (!data?.name || !data?.message) {
        return new Response('Invalid input', { status: 400 });
      }

      const key = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const record = {
        name: data.name.slice(0, 100),
        message: data.message.slice(0, 1000),
        timestamp: Date.now(),
        replies: []
      };

      await bucket.put(key, JSON.stringify(record));
      return jsonResponse({ success: true });
    }

    if (request.method === 'DELETE') {
      const { password, key } = await request.json().catch(() => ({}));
      if (password !== env.ADMIN_PASSWORD) return new Response('Forbidden', { status: 403 });
      if (!key) return new Response('Missing key', { status: 400 });

      await bucket.delete(key);
      return jsonResponse({ deleted: key });
    }

    if (request.method === 'PATCH') {
      const data = await request.json().catch(() => ({}));
      if (data.password !== env.ADMIN_PASSWORD) return new Response('Forbidden', { status: 403 });
      if (!data.key) return new Response('Missing key', { status: 400 });

      const res = await bucket.get(data.key);
      if (!res) return new Response('Not Found', { status: 404 });

      const text = await res.text();
      const record = JSON.parse(text);

      // 添加回复
      if (data.name && data.message) {
        record.replies = record.replies || [];
        record.replies.push({
          name: data.name.slice(0, 100),
          message: data.message.slice(0, 1000),
          timestamp: Date.now()
        });
      }

      // 删除回复
      if (typeof data.delete_reply === 'number') {
        if (Array.isArray(record.replies) && data.delete_reply >= 0) {
          record.replies.splice(data.delete_reply, 1);
        }
      }

      // 修改回复
      if (data.update_reply && typeof data.update_reply.index === 'number' && data.update_reply.message) {
        if (Array.isArray(record.replies) && record.replies[data.update_reply.index]) {
          record.replies[data.update_reply.index].message = data.update_reply.message.slice(0, 1000);
        }
      }

      await bucket.put(data.key, JSON.stringify(record));
      return jsonResponse({ updated: data.key });
    }

    return new Response('Method Not Allowed', { status: 405 });
  }
};

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS,PATCH',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}