import { sandboxWorkspace } from "../../contracts/runtime"
import {
  boundedInteger,
  optionalTrimmedString,
  requiredTrimmedString,
} from "./input"
import { runJsonScript } from "./script"
import { type SandboxRuntime } from "./types"

export async function grepWorkspace(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  return await runJsonScript({
    input: {
      mode: "grep",
      pattern: requiredTrimmedString(input.pattern, "pattern"),
      path: optionalTrimmedString(input.path),
      include: optionalTrimmedString(input.include),
      limit: boundedInteger(input.limit, 100, 1, 500),
    },
    sandbox,
    script: searchScript,
    timeoutMs: 60_000,
  })
}

export async function globWorkspace(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  return await runJsonScript({
    input: {
      mode: "glob",
      pattern: requiredTrimmedString(input.pattern, "pattern"),
      path: optionalTrimmedString(input.path),
      limit: boundedInteger(input.limit, 200, 1, 1_000),
    },
    sandbox,
    script: searchScript,
    timeoutMs: 60_000,
  })
}

const searchScript = String.raw`
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const input = JSON.parse(process.env.MILO_TOOL_INPUT ?? "{}");
const workspace = ${JSON.stringify(sandboxWorkspace)};
const skipped = new Set([".git", "node_modules", "dist"]);

const root = await fs.promises.realpath(workspace);
const base = await resolveBase(input.path);
const result = input.mode === "grep"
  ? await grep(base)
  : await glob(base);

console.log(JSON.stringify(result));

async function grep(base) {
  const pattern = new RegExp(input.pattern);
  const include = input.include === undefined ? null : globRegex(input.include);
  const matches = [];

  for await (const file of walk(base)) {
    if (include !== null && !include.test(file.relative)) continue;
    await grepFile(file, pattern, matches);
    if (matches.length > input.limit) break;
  }

  return {
    matches: matches.slice(0, input.limit),
    truncated: matches.length > input.limit,
  };
}

async function grepFile(file, pattern, matches) {
  const stream = fs.createReadStream(file.real, { encoding: "utf8" });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;

  for await (const line of lines) {
    lineNumber += 1;

    if (pattern.test(line)) {
      pattern.lastIndex = 0;
      matches.push({
        path: file.relative,
        lineNumber,
        line: line.length > 500 ? line.slice(0, 500) + "..." : line,
      });
    }

    if (matches.length > input.limit) {
      lines.close();
      stream.destroy();
      break;
    }
  }
}

async function glob(base) {
  const pattern = globRegex(input.pattern);
  const paths = [];

  for await (const file of walk(base)) {
    if (pattern.test(file.fromBase)) {
      paths.push(file.relative);
    }

    if (paths.length > input.limit) break;
  }

  return {
    paths: paths.slice(0, input.limit),
    truncated: paths.length > input.limit,
  };
}

async function* walk(base) {
  const stats = await fs.promises.stat(base.real);

  if (stats.isFile()) {
    yield fileInfo(base.real, base.baseReal);
    return;
  }

  for await (const file of walkDirectory(base.real, base.baseReal)) {
    yield file;
  }
}

async function* walkDirectory(directory, baseReal) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (entry.isSymbolicLink() || skipped.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walkDirectory(entryPath, baseReal);
    } else if (entry.isFile()) {
      yield fileInfo(entryPath, baseReal);
    }
  }
}

async function resolveBase(value) {
  const target = path.resolve(workspace, value ?? ".");
  const real = await fs.promises.realpath(target);
  const relative = path.relative(root, real);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path must be inside the Milo workspace.");
  }

  return { real, baseReal: real };
}

function fileInfo(real, baseReal) {
  return {
    real,
    relative: path.relative(root, real).split(path.sep).join("/"),
    fromBase: path.relative(baseReal, real).split(path.sep).join("/"),
  };
}

function globRegex(pattern) {
  let source = "^";
  const value = pattern.replace(/^\/+/, "");

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "*" && value[index + 1] === "*") {
      source += value[index + 2] === "/" ? "(?:.*/)?" : ".*";
      index += value[index + 2] === "/" ? 2 : 1;
    } else if (character === "*") {
      source += "[^/]*";
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += escapeRegex(character);
    }
  }

  return new RegExp(source + "$");
}

function escapeRegex(value) {
  return /[\\^$+?.()|[\]{}]/.test(value) ? "\\" + value : value;
}
`
