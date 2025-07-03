addEventListener("fetch", event => {
  event.respondWith(
    new Response("Cloudflare Worker 已部署成功！", {
      headers: { "content-type": "text/plain" },
    })
  );
});