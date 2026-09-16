import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";

const root = process.argv[2] ?? "out";
const port = Number(process.argv[3] ?? 3111);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    let path = normalize(req.url.split("?")[0]).replace(/^([/\\])+/, "");
    if (!path) path = "index.html";
    if (path.endsWith("/") || path.endsWith("\\")) path += "index.html";
    const file = join(root, path);
    await stat(file); // throw if missing
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://localhost:${port}`));