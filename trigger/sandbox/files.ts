import { sandboxWorkspace } from "../../contracts/runtime"
import { boundedInteger, requiredTrimmedString } from "./input"
import { runJsonScript } from "./script"
import { type SandboxRuntime } from "./types"

export async function readWorkspaceFile(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  return await runJsonScript({
    input: {
      path: requiredTrimmedString(input.path, "path"),
      offset: boundedInteger(input.offset, 1, 1, 1_000_000),
      limit: boundedInteger(input.limit, 200, 1, 2_000),
    },
    sandbox,
    script: readScript,
    timeoutMs: 30_000,
  })
}

const readScript = String.raw`
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const input = JSON.parse(process.env.MILO_TOOL_INPUT ?? "{}");
const workspace = ${JSON.stringify(sandboxWorkspace)};
const maxChars = 20_000;

const file = await resolveFile(input.path);
const offset = input.offset;
const limit = input.limit;
const stream = fs.createReadStream(file.real, { encoding: "utf8" });
const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
let content = "";
let endLine = offset - 1;
let lineNumber = 0;
let readLines = 0;
let truncated = false;

for await (const line of lines) {
  lineNumber += 1;

  if (lineNumber < offset) continue;
  if (readLines >= limit) {
    truncated = true;
    lines.close();
    stream.destroy();
    break;
  }

  const next = String(lineNumber) + ": " + line + "\n";
  if (content.length + next.length > maxChars) {
    content += next.slice(0, maxChars - content.length);
    truncated = true;
    lines.close();
    stream.destroy();
    break;
  }

  content += next;
  endLine = lineNumber;
  readLines += 1;
}

console.log(JSON.stringify({
  path: file.relative,
  startLine: offset,
  endLine,
  content,
  truncated,
}));

async function resolveFile(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Missing path");
  }

  const target = path.resolve(workspace, value);
  const root = await fs.promises.realpath(workspace);
  const real = await fs.promises.realpath(target);
  const relative = path.relative(root, real);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path must be inside the Milo workspace.");
  }

  const stats = await fs.promises.stat(real);
  if (!stats.isFile()) {
    throw new Error("Path is not a file.");
  }

  return { real, relative: relative.split(path.sep).join("/") };
}
`
