const DISK_SIZE = 4 * 1024 * 1024 * 1024;
const MAX_RANGE_SIZE = 16 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range",
  "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, Content-Type",
  "Accept-Ranges": "bytes",
  "Content-Type": "application/octet-stream",
  "Cache-Control": "no-store, no-transform",
  "Cross-Origin-Resource-Policy": "cross-origin"
};

function rangeError() {
  return new Response(null, {
    status: 416,
    headers: {
      ...CORS_HEADERS,
      "Content-Range": `bytes */${DISK_SIZE}`,
      "Content-Length": "0"
    }
  });
}

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

  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Length": String(DISK_SIZE) }
    });
  }

  const range = request.headers.get("Range");
  if (!range) return rangeError();

  const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
  if (!match) return rangeError();

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : DISK_SIZE - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) ||
      start < 0 || start >= DISK_SIZE || requestedEnd < start) {
    return rangeError();
  }

  const end = Math.min(requestedEnd, DISK_SIZE - 1);
  const length = end - start + 1;
  if (length > MAX_RANGE_SIZE) return rangeError();

  // This is a sparse, all-zero virtual disk. The browser VM caches sectors
  // that the guest writes in its own session; no host disk is exposed.
  const zeroes = new Uint8Array(length);
  return new Response(zeroes, {
    status: 206,
    headers: {
      ...CORS_HEADERS,
      "Content-Length": String(length),
      "Content-Range": `bytes ${start}-${end}/${DISK_SIZE}`
    }
  });
}
