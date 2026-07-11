import { sandboxWorkspace } from "../../../contracts/runtime"
import { boundedText, compactFailure } from "../output"
import { shellQuote } from "../path"
import { type SandboxRuntime } from "../types"

export async function applyUnifiedPatch(
  sandbox: SandboxRuntime,
  patch: string,
  cwd: string
) {
  const content = patch.endsWith("\n") ? patch : `${patch}\n`
  const patchPath = `/tmp/milo-patch-${Date.now()}.diff`
  await sandbox.writeFiles([{ content, path: patchPath }])

  const result = await sandbox.runCommand({
    command: applyCommand(patchPath, cwd),
    cwd: sandboxWorkspace,
    timeoutMs: 120_000,
  })

  if (result.exitCode !== 0) {
    throw new Error(compactFailure(result))
  }

  return {
    applied: true,
    stdout: boundedText(result.stdout).text,
    stderr: boundedText(result.stderr).text,
  }
}

function applyCommand(patchPath: string, cwd: string) {
  return [
    "set -eu",
    `export patch_file=${shellQuote(patchPath)}`,
    `export patch_cwd=${shellQuote(cwd)}`,
    "trap 'rm -f \"$patch_file\"' EXIT",
    validationCommand(),
    'cd "$patch_cwd"',
    'git apply --check --whitespace=nowarn "$patch_file"',
    'git apply --whitespace=nowarn "$patch_file"',
  ].join("\n")
}

function validationCommand() {
  return String.raw`node --input-type=module <<'MILO_PATCH_VALIDATOR'
import fs from "node:fs";
import path from "node:path";

const workspace = ${JSON.stringify(sandboxWorkspace)};
const patch = await fs.promises.readFile(process.env.patch_file, "utf8");
const root = await fs.promises.realpath(workspace);
const base = await resolveBase(process.env.patch_cwd);

if (patch.includes("GIT binary patch") || patch.includes("new file mode 120000")) {
  throw new Error("Binary and symlink patches are not supported.");
}

const paths = [...patchPaths(patch)];

for (const filePath of paths) {
  await assertWorkspacePath(filePath);
}

function* patchPaths(source) {
  for (const line of source.split("\n")) {
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      const filePath = line.slice(4).trim().split("\t")[0];
      if (filePath !== "/dev/null") yield stripPrefix(filePath);
    } else if (line.startsWith("rename from ")) {
      yield stripPrefix(line.slice("rename from ".length).trim());
    } else if (line.startsWith("rename to ")) {
      yield stripPrefix(line.slice("rename to ".length).trim());
    }
  }
}

function stripPrefix(filePath) {
  if (filePath.startsWith("a/") || filePath.startsWith("b/")) {
    return filePath.slice(2);
  }

  return filePath;
}

async function assertWorkspacePath(filePath) {
  const normalized = path.posix.normalize(filePath);

  if (normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error("Patch path escapes the Milo workspace: " + filePath);
  }

  const target = path.join(base, normalized);
  const parent = await nearestExistingParent(path.dirname(target));
  const relative = path.relative(root, await fs.promises.realpath(parent));

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Patch path escapes the Milo workspace: " + filePath);
  }
}

async function resolveBase(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("patch cwd is required.");
  }

  const real = await fs.promises.realpath(value);
  const relative = path.relative(root, real);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Patch cwd must be inside the Milo workspace.");
  }

  return real;
}

async function nearestExistingParent(directory) {
  let current = directory;

  while (current.startsWith(root)) {
    try {
      const stats = await fs.promises.stat(current);
      if (stats.isDirectory()) return current;
    } catch {
      current = path.dirname(current);
    }
  }

  throw new Error("Patch path must be inside the Milo workspace.");
}
MILO_PATCH_VALIDATOR`
}
