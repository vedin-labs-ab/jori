import { optionalString } from "../../../shared/input"
import { requiredTrimmedString } from "../input"
import { sandboxWorkspacePath } from "../path"
import { type SandboxRuntime } from "../types"
import { applyEnvelopePatch, isEnvelopePatch } from "./envelope"
import { applyUnifiedPatch } from "./unified"

const maxPatchChars = 500_000

/** Models emit either classic unified diffs or the "*** Begin Patch"
 *  envelope; accept both rather than fighting trained priors. */
export async function applyWorkspacePatch(
  sandbox: SandboxRuntime,
  input: Record<string, unknown>
) {
  const patch = requiredTrimmedString(input.patch, "patch")
  const cwd = sandboxWorkspacePath(optionalString(input.cwd))

  if (patch.length > maxPatchChars) {
    throw new Error(`Patch exceeds ${maxPatchChars} characters.`)
  }

  return isEnvelopePatch(patch)
    ? await applyEnvelopePatch(sandbox, patch, cwd)
    : await applyUnifiedPatch(sandbox, patch, cwd)
}
