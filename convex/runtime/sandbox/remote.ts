import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import {
  type SandboxCloneRepositoryInput,
  type SandboxCommandHandle,
  type SandboxCommandInput,
  type SandboxRuntime,
  type SandboxWriteFile,
} from "./types"

/** The E2B SDK only runs in Node, so every sandbox call crosses into an action
 *  there. Those actions are stateless: this holds the sandbox they answer with
 *  and hands it to the next one, so a run creates at most one. */
export class RemoteSandbox implements SandboxRuntime {
  constructor(
    private readonly ctx: ActionCtx,
    private readonly runId: Id<"runs">,
    private sandboxId: string | null
  ) {}

  async runCommand(input: SandboxCommandInput) {
    return this.remember(
      await this.ctx.runAction(internal.runtime.sandbox.e2b.command, {
        ...this.target,
        input,
      })
    ).result
  }

  async startCommand(input: SandboxCommandInput) {
    const outcome = this.remember(
      await this.ctx.runAction(internal.runtime.sandbox.e2b.start, {
        ...this.target,
        input,
        token: commandToken(),
      })
    )

    return "handle" in outcome ? outcome.handle : outcome.result
  }

  async finishCommand(
    handle: SandboxCommandHandle,
    options: { kill: boolean }
  ) {
    return this.remember(
      await this.ctx.runAction(internal.runtime.sandbox.e2b.finish, {
        ...this.target,
        handle,
        kill: options.kill,
      })
    ).result
  }

  async readFile(path: string) {
    const outcome = this.remember(
      await this.ctx.runAction(internal.runtime.sandbox.e2b.read, {
        ...this.target,
        path,
      })
    )

    return new Uint8Array(outcome.content)
  }

  async writeFiles(files: SandboxWriteFile[]) {
    this.remember(
      await this.ctx.runAction(internal.runtime.sandbox.e2b.write, {
        ...this.target,
        files: files.map((file) => ({
          content: wireContent(file.content),
          path: file.path,
        })),
      })
    )
  }

  async cloneRepository(input: SandboxCloneRepositoryInput) {
    return this.remember(
      await this.ctx.runAction(internal.runtime.sandbox.e2b.clone, {
        ...this.target,
        input,
      })
    ).result
  }

  private get target() {
    return { runId: this.runId, sandboxId: this.sandboxId }
  }

  private remember<Outcome extends { sandboxId: string }>(outcome: Outcome) {
    this.sandboxId = outcome.sandboxId

    return outcome
  }
}

/** The token is the only thing guarding the command callback, so it is a fresh
 *  32 random bytes per command and wakes nothing but its own waiter. */
function commandToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

/** Convex carries bytes as an ArrayBuffer, so the port's views are copied out
 *  on the way in and rebuilt on the way back. */
function wireContent(content: string | Uint8Array) {
  return typeof content === "string" ? content : new Uint8Array(content).buffer
}
