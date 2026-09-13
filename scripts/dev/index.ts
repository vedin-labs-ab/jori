import { execFileSync, spawn, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { connect } from "node:net"
import path from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { commonDirectory } from "../git.ts"
import { type Facts, needsInstall, stateOf } from "./state.ts"

/**
 * Usage: pnpm dev:check | pnpm dev:up | pnpm dev:down
 *
 * One server for `main`, on the port the app expects, owned by nobody's
 * terminal. `up` is idempotent: it installs when a landing brought a new
 * package, starts when nothing answers, restarts when the server predates
 * its inputs, and otherwise says so. Every command serves the primary
 * checkout, whichever worktree it is run from.
 */
const port = 8050
const url = `http://localhost:${port}`
const primary = path.dirname(commonDirectory())
const directory = path.join(primary, ".dev")
const recordFile = path.join(directory, "server.json")
const logFile = path.join(directory, "server.log")
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"

type Record = { pid: number; startedAt: number }

const [action] = process.argv.slice(2)

switch (action) {
  case "check":
    await check()
    break
  case "up":
    await up()
    break
  case "down":
    await down()
    break
  default:
    throw new Error("Usage: pnpm dev:check | pnpm dev:up | pnpm dev:down")
}

async function check() {
  const facts = await gather()
  const state = stateOf(facts)

  switch (state.kind) {
    case "up":
      write(`main is up at ${url} (pid ${readRecord()?.pid}, ${age(facts)}).`)
      return
    case "foreign":
      write(
        `${url} answers, but not from pnpm dev:up. Leave it or stop it yourself.`
      )
      return
    case "stale":
      write(`main is stale: ${state.reasons.join("; ")}. Run pnpm dev:up.`)
      process.exitCode = 2
      return
    case "down":
      write(`main is down. Run pnpm dev:up.`)
      process.exitCode = 1
  }
}

async function up() {
  const facts = await gather()
  const state = stateOf(facts)

  if (state.kind === "up") {
    write(`main is already up at ${url} (${age(facts)}).`)
    return
  }
  if (state.kind === "foreign") {
    write(`${url} answers, but not from pnpm dev:up. Leaving it.`)
    return
  }
  if (state.kind === "stale") {
    write(`Restarting main: ${state.reasons.join("; ")}.`)
    await stop()
  }
  if (needsInstall(facts)) {
    install()
  }
  await start()
}

async function down() {
  const state = stateOf(await gather())

  if (state.kind === "down") {
    write("main is not running.")
    rmSync(recordFile, { force: true })
    return
  }
  if (state.kind === "foreign") {
    throw new Error(
      `${url} answers, but not from pnpm dev:up. Stop it where you started it.`
    )
  }

  await stop()
  write("main is stopped.")
}

async function gather(): Promise<Facts> {
  const record = readRecord()

  return {
    answering: await answering(),
    alive: record !== undefined && isAlive(record.pid),
    startedAt: record?.startedAt,
    lockModified: modified("pnpm-lock.yaml"),
    modulesModified: modified("node_modules/.modules.yaml"),
    envModified: modified(".env.local"),
  }
}

function install() {
  write("Installing dependencies the lockfile added.")
  const result = spawnSync(
    pnpm,
    ["install", "--prefer-offline", "--frozen-lockfile"],
    { cwd: primary, env: { ...process.env, CI: "true" }, stdio: "inherit" }
  )

  if (result.status !== 0) {
    throw new Error("Installing dependencies failed.")
  }
}

async function start() {
  mkdirSync(directory, { recursive: true })
  const log = openSync(logFile, "a")
  // Its own process group, so `down` can stop the watcher and Vite
  // together, and so closing whatever ran `up` leaves it alone.
  const child = spawn(pnpm, ["dev"], {
    cwd: primary,
    detached: true,
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["ignore", log, log],
  })

  if (child.pid === undefined) {
    throw new Error("Starting pnpm dev failed.")
  }
  writeRecord({ pid: child.pid, startedAt: Date.now() })
  child.unref()

  write(`Starting main, logging to ${logFile}.`)
  for (let waited = 0; waited < 120_000; waited += 500) {
    if (await answering()) {
      write(`main is up at ${url}.`)
      return
    }
    if (!isAlive(child.pid)) {
      break
    }
    await sleep(500)
  }

  rmSync(recordFile, { force: true })
  throw new Error(`main did not come up on ${port}. See ${logFile}.`)
}

/** Vite leaves the process group its ancestors share, so the group alone
 *  would orphan it on the port. The whole tree is listed before anything
 *  is signalled, then signalled leaf first. */
async function stop() {
  const record = readRecord()

  if (record !== undefined && isAlive(record.pid)) {
    const tree = descendants(record.pid).reverse()

    signal(tree, "SIGTERM")
    for (let waited = 0; waited < 15_000 && tree.some(isAlive); waited += 250) {
      await sleep(250)
    }
    signal(tree.filter(isAlive), "SIGKILL")
  }
  rmSync(recordFile, { force: true })
}

/** The process and everything under it, parents before children. */
function descendants(root: number) {
  const children = new Map<number, number[]>()

  for (const line of execFileSync("ps", ["-axo", "pid=,ppid="], {
    encoding: "utf8",
  }).split("\n")) {
    const [pid, ppid] = line.trim().split(/\s+/).map(Number)

    if (pid && ppid) {
      children.set(ppid, [...(children.get(ppid) ?? []), pid])
    }
  }

  const tree: number[] = []
  const queue = [root]
  for (let pid = queue.shift(); pid !== undefined; pid = queue.shift()) {
    tree.push(pid)
    queue.push(...(children.get(pid) ?? []))
  }

  return tree
}

function signal(pids: number[], name: NodeJS.Signals) {
  for (const pid of pids) {
    try {
      process.kill(pid, name)
    } catch {
      // Already gone.
    }
  }
}

/** Vite binds whichever localhost the machine resolves first, so ask both. */
async function answering() {
  const results = await Promise.all(["::1", "127.0.0.1"].map(accepts))

  return results.some(Boolean)
}

function accepts(host: string) {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ host, port })
    const settle = (result: boolean) => {
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(1000, () => settle(false))
    socket.once("connect", () => settle(true))
    socket.once("error", () => settle(false))
  })
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readRecord(): Record | undefined {
  try {
    return JSON.parse(readFileSync(recordFile, "utf8")) as Record
  } catch {
    return undefined
  }
}

function writeRecord(record: Record) {
  writeFileSync(recordFile, `${JSON.stringify(record)}\n`)
}

function modified(relativePath: string) {
  const file = path.join(primary, relativePath)

  return existsSync(file) ? statSync(file).mtimeMs : undefined
}

function age(facts: Facts) {
  const minutes = Math.round((Date.now() - (facts.startedAt ?? 0)) / 60_000)

  return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`
}

function write(line: string) {
  process.stdout.write(`${line}\n`)
}
