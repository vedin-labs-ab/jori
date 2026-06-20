import { requiredString } from "./input"
import { boundedText, compactFailure } from "./output"
import { shellQuote } from "./path"
import { type SandboxRuntime } from "./types"

const maxPatchChars = 500_000

export async function applyWorkspacePatch(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  const patch = requiredString(input.patch, "patch")

  if (patch.length > maxPatchChars) {
    throw new Error(`Patch exceeds ${maxPatchChars} characters.`)
  }

  const content = patch.endsWith("\n") ? patch : `${patch}\n`
  const patchPath = `/tmp/milo-patch-${Date.now()}.diff`
  await sandbox.writeFiles([{ content, path: patchPath }])

  const result = await sandbox.runCommand({
    command: applyCommand(patchPath),
    cwd: "/home/user/milo-workspace",
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

function applyCommand(patchPath: string) {
  return [
    "set -eu",
    `export patch_file=${shellQuote(patchPath)}`,
    "trap 'rm -f \"$patch_file\"' EXIT",
    validationCommand(),
    'git apply --check --whitespace=nowarn "$patch_file"',
    'git apply --whitespace=nowarn "$patch_file"',
  ].join("\n")
}

function validationCommand() {
  return String.raw`node --input-type=module <<'MILO_PATCH_VALIDATOR'
import fs from "node:fs";
import path from "node:path";

const workspace = "/home/user/milo-workspace";
const patch = await fs.promises.readFile(process.env.patch_file, "utf8");
const root = await fs.promises.realpath(workspace);

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

  const target = path.join(root, normalized);
  const parent = await nearestExistingParent(path.dirname(target));
  const relative = path.relative(root, await fs.promises.realpath(parent));

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Patch path escapes the Milo workspace: " + filePath);
  }
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
