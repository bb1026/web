addEventListener("fetch", event => {
  event.respondWith(
    new Response("Hello from Cloudflare Worker!", {
      headers: { "content-type": "text/plain" },
    })
  );
});