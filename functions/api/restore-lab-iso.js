const ISO_URL =
  "https://github.com/sd201826/Computer/releases/download/restore-lab-live-latest/Restore-Lab-Installer-amd64.iso";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, If-Range, If-None-Match, If-Modified-Since",
  "Access-Control-Expose-Headers":
    "Accept-Ranges, Content-Length, Content-Range, Content-Type, ETag, Last-Modified",
  "Cross-Origin-Resource-Policy": "cross-origin"
};

export async function onRequest({ request }) {
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

  const headers = new Headers();
  for (const name of ["Range", "If-Range", "If-None-Match", "If-Modified-Since"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(ISO_URL, {
      method: request.method,
      headers,
      redirect: "follow"
    });

    // A range request must stay a partial response; do not accidentally stream
    // the entire installer ISO if the upstream host stops honoring Range.
    if (request.headers.has("Range") && upstream.status !== 206 && upstream.status !== 416) {
      return new Response("The ISO host did not honor the requested byte range.", {
        status: 502,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    const responseHeaders = new Headers(upstream.headers);
    for (const [name, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(name, value);
    }
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "no-store, no-transform");
    if (!responseHeaders.has("Content-Type")) {
      responseHeaders.set("Content-Type", "application/octet-stream");
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return new Response("Unable to reach the Restore Lab ISO host.", {
      status: 502,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
}
