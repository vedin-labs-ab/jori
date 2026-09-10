import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer, type ServerResponse } from "node:http"
import path from "node:path"
import { createGzip } from "node:zlib"

const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
}

export function serve(directory: string, port: number) {
  const root = path.resolve(directory)
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname
    const file = path.resolve(root, `.${decodeURIComponent(pathname)}`)
    if (!file.startsWith(`${root}/`)) {
      response.writeHead(403).end()
      return
    }
    const gzip = request.headers["accept-encoding"]?.includes("gzip") ?? false
    void send(file, gzip, response).catch(() => response.writeHead(404).end())
  })
  server.listen(port, "127.0.0.1")
  return server
}

async function send(file: string, gzip: boolean, response: ServerResponse) {
  const metadata = await stat(file)
  if (!metadata.isFile()) {
    response.writeHead(404).end()
    return
  }
  const extension = path.extname(file)
  response.setHeader(
    "Content-Type",
    types[extension] ?? "application/octet-stream"
  )
  response.setHeader(
    "Cache-Control",
    extension === ".html" ? "no-cache" : "public, max-age=3600"
  )
  response.setHeader("Vary", "Accept-Encoding")
  if (gzip && [".html", ".css", ".js", ".json", ".svg"].includes(extension)) {
    response.setHeader("Content-Encoding", "gzip")
    createReadStream(file).pipe(createGzip()).pipe(response)
  } else {
    createReadStream(file).pipe(response)
  }
}
