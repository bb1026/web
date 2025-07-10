// file-trash.js
export async function moveToTrash(env, fileKey, userKey) {
    const file = await env.BUCKET.get(fileKey, { include: ['customMetadata'] });
    if (!file) return;

    const trashPath = `__trash__/${userKey}/${Date.now()}_${fileKey.replace(/\//g, '_')}`;
    
    await env.BUCKET.put(trashPath, file.body, {
        httpMetadata: file.httpMetadata,
        customMetadata: {
            ...file.customMetadata,
            originalName: fileKey,
            deleteTime: Date.now().toString()
        }
    });
    
    await env.BUCKET.delete(fileKey);
}

export async function cleanTrash(env) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trashFiles = await env.BUCKET.list({ prefix: '__trash__/' });

    for (const file of trashFiles.objects) {
        const deleteTime = parseInt(file.customMetadata?.deleteTime || '0');
        if (deleteTime < sevenDaysAgo) {
            await env.BUCKET.delete(file.key);
        }
    }
}