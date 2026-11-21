const RELEASE_BASE = "https://github.com/portlandhodl/v86_64/releases/download/latest/";
const RAW_BASE = "https://raw.githubusercontent.com/portlandhodl/v86_64/master/";

const ASSETS = {
  "libv86.js": {
    url: RELEASE_BASE + "libv86.js",
    contentType: "application/javascript; charset=utf-8"
  },
  "v86.wasm": {
    url: RELEASE_BASE + "v86.wasm",
    contentType: "application/wasm"
  },
  "v86-fallback.wasm": {
    url: RELEASE_BASE + "v86-fallback.wasm",
    contentType: "application/wasm"
  },
  "seabios.bin": {
    url: RAW_BASE + "bios/seabios.bin",
    contentType: "application/octet-stream"
  },
  "vgabios.bin": {
    url: RAW_BASE + "bios/vgabios.bin",
    contentType: "application/octet-stream"
  }
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Type, ETag",
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

  const asset = ASSETS[params.asset];
  if (!asset) {
    return new Response("Not found", {
      status: 404,
      headers: CORS_HEADERS
    });
  }

  try {
    const upstream = await fetch(asset.url, {
      method: request.method,
      redirect: "follow"
    });

    if (!upstream.ok) {
      return new Response("The browser VM engine asset could not be loaded.", {
        status: 502,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    const headers = new Headers(upstream.headers);
    for (const [name, value] of Object.entries(CORS_HEADERS)) {
      headers.set(name, value);
    }
    headers.set("Content-Type", asset.contentType);
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
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
