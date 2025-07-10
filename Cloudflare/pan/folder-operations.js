// folder-operations.js
export async function handleMkdir(env, folderPath, role, userKey) {
    if (role !== 'admin' && role !== 'upload') {
        return new Response('Forbidden', { status: 403 });
    }

    const fullPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    await env.BUCKET.put(fullPath, new Uint8Array(), {
        customMetadata: {
            uploader: userKey,
            uploadTime: Date.now().toString(),
            isFolder: 'true'
        }
    });

    return { success: true };
}

export async function handleListFiles(env, path, role, userKey) {
    const files = await env.BUCKET.list({ 
        prefix: path || '',
        include: ['customMetadata'] 
    });

    return files.objects.filter(file => {
        return (role === 'admin' || file.customMetadata?.visible !== 'false');
    });
}