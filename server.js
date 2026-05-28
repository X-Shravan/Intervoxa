const http = require("node:http");
const { readFile } = require("node:fs/promises");
const { extname, join, normalize } = require("node:path");

const port = process.env.PORT || 3000;
const publicRoot = process.cwd();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const safePath = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^\.\.(\/|\\|$)/, "");
  const filePath = join(publicRoot, safePath);

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Intervoxa landing page running at http://localhost:${port}`);
});
