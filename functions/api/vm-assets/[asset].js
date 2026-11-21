const BASE_URL = "https://portlandhodl.github.io/v86_64/";

const ASSETS = {
  "v86_all.js": "build/v86_all.js?98e7110c2",
  "v86.wasm": "build/v86.wasm",
  "seabios.bin": "bios/seabios.bin",
  "vgabios.bin": "bios/vgabios.bin"
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cross-Origin-Resource-Policy": "cross-origin"
};

export async function onRequest({ request, params }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" }
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...CORS_HEADERS, Allow: "GET, HEAD, OPTIONS" }
    });
  }

  const assetPath = ASSETS[params.asset];
  if (!assetPath) {
    return new Response("Not found", {
      status: 404,
      headers: CORS_HEADERS
    });
  }

  try {
    const upstream = await fetch(new URL(assetPath, BASE_URL), {
      method: request.method,
      redirect: "follow"
    });

    const headers = new Headers(upstream.headers);
    for (const [name, value] of Object.entries(CORS_HEADERS)) {
      headers.set(name, value);
    }
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  } catch (error) {
    return new Response("Unable to load the browser VM engine asset.", {
      status: 502,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
}
