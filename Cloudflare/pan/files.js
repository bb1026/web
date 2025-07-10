// files.js
import { corsHeaders, verifyAuth, getConfig, jsonResponse } from './utils.js';

export async function handleFileRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^files\/+/, '');
  const params = url.searchParams;

  // 验证权限
  const auth = await verifyAuth(request, env);
  if (!auth.valid) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    switch (path) {
      case 'upload':
        return handleFileUpload(request, env, auth);
      case 'download':
        return handleFileDownload(env, params, auth);
      case 'list':
        return handleFileList(env, auth);
      case 'mkdir':
        return handleMakeDir(request, env, auth);
      default:
        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('文件操作错误:', error);
    return jsonResponse({ error: '服务器错误' }, 500);
  }
}

async function handleFileUpload(request, env, auth) {
  if (auth.role !== 'admin' && auth.role !== 'upload') {
    return jsonResponse({ error: '无上传权限' }, 403);
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) {
    return jsonResponse({ error: '未选择文件' }, 400);
  }

  await env.BUCKET.put(file.name, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { 
      uploader: auth.key,
      uploadTime: new Date().toISOString()
    }
  });

  return jsonResponse({ 
    success: true,
    filename: file.name,
    size: file.size
  });
}

async function handleFileDownload(env, params, auth) {
  const fileKey = params.get('key');
  if (!fileKey) {
    return jsonResponse({ error: '缺少文件参数' }, 400);
  }

  const file = await env.BUCKET.get(fileKey);
  if (!file) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(file.body, {
    headers: {
      'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
      ...corsHeaders
    }
  });
}

async function handleFileList(env, auth) {
  const files = await env.BUCKET.list();
  return jsonResponse({
    files: files.objects.map(file => ({
      name: file.key,
      size: file.size,
      uploadTime: file.uploaded
    }))
  });
}

async function handleMakeDir(request, env, auth) {
  if (auth.role !== 'admin' && auth.role !== 'upload') {
    return jsonResponse({ error: '无权限创建目录' }, 403);
  }

  const { path } = await request.json();
  if (!path) {
    return jsonResponse({ error: '缺少路径参数' }, 400);
  }

  const dirPath = path.endsWith('/') ? path : `${path}/`;
  await env.BUCKET.put(dirPath, new Uint8Array(), {
    customMetadata: {
      isDirectory: 'true',
      creator: auth.key
    }
  });

  return jsonResponse({ success: true });
}