import { closeSync, openSync, readSync, statSync } from "node:fs"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"

const file = process.env.MILO_TRACE_FILE ?? "/tmp/milo-trace.ndjson"
const token = process.env.MILO_TRACE_TOKEN
const port = Number(process.env.MILO_TRACE_PORT ?? "8211")
const pollIntervalMs = 250
const keepaliveTicks = 60

createServer((request: IncomingMessage, response: ServerResponse) => {
  const url = new URL(request.url ?? "/", "http://sandbox")

  if (url.pathname !== "/trace" || url.searchParams.get("token") !== token) {
    response.writeHead(404)
    response.end()
    return
  }

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "text/event-stream",
  })

  let offset = 0
  let pending = ""
  let idleTicks = 0

  const forward = () => {
    const size = statSync(file).size

    if (size <= offset) {
      idleTicks += 1

      if (idleTicks >= keepaliveTicks) {
        idleTicks = 0
        response.write(":keepalive\n\n")
      }

      return
    }

    idleTicks = 0
    const chunk = Buffer.alloc(size - offset)
    const descriptor = openSync(file, "r")
    readSync(descriptor, chunk, 0, chunk.length, offset)
    closeSync(descriptor)
    offset = size
    pending += chunk.toString("utf8")
    const lines = pending.split("\n")
    pending = lines.pop() ?? ""

    for (const line of lines) {
      if (line !== "") {
        response.write(`data: ${line}\n\n`)
      }
    }
  }

  forward()
  const interval = setInterval(forward, pollIntervalMs)
  request.on("close", () => clearInterval(interval))
}).listen(port)
