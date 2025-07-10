// file-operations.js
import { moveToTrash } from './file-trash.js';

export async function handleUpload(request, env, role, userKey) {
    if (role !== 'admin' && role !== 'upload') {
        return new Response('Forbidden', { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('file');
    const currentPath = formData.get('path') || '';

    const results = [];
    for (const file of files) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        
        await env.BUCKET.put(filePath, file.stream(), {
            httpMetadata: { contentType: file.type },
            customMetadata: { 
                uploader: userKey,
                uploadTime: Date.now().toString(),
                visible: 'true'
            }
        });
        results.push(filePath);
    }

    return { success: true, files: results };
}

export async function handleDownload(env, fileKey, role) {
    const file = await env.BUCKET.get(fileKey, { include: ['customMetadata'] });
    if (!file) return new Response('Not Found', { status: 404 });

    if (file.customMetadata?.visible === 'false' && role !== 'admin') {
        return new Response('Forbidden', { status: 403 });
    }

    return new Response(file.body, {
        headers: {
            'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream'
        }
    });
}

export async function handleDelete(env, fileKey, role, userKey) {
    const target = await env.BUCKET.get(fileKey, { include: ['customMetadata'] });
    if (!target) return new Response('Not Found', { status: 404 });

    if (role !== 'admin' && target.customMetadata?.uploader !== userKey) {
        return new Response('Forbidden', { status: 403 });
    }

    await moveToTrash(env, fileKey, userKey);
    return { success: true };
}