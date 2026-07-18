import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = new URL("../dist/standalone/", import.meta.url).pathname;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const relative = normalize(pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
    if (relative.startsWith("..")) throw new Error("Path traversal rejected");
    const path = join(root, relative);
    const info = await stat(path);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "content-type": contentTypes[extname(path)] ?? "application/octet-stream" });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(4173, "127.0.0.1", () => {
  console.log("Footprint Map preview: http://127.0.0.1:4173");
});
