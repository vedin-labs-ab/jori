import { type ActionCtx } from "../../_generated/server"
import { type LoadedRuntime } from "../context"
import { RemoteSandbox } from "../sandbox/remote"
import { ActionPlatform } from "./action"
import { type AgentRuntime } from "./types"

/** The runtime a step hands its loop: this action as the platform, and the
 *  run's sandbox reached through Node actions. */
export function createAgentRuntime(
  ctx: ActionCtx,
  loaded: LoadedRuntime
): AgentRuntime {
  return {
    context: loaded.context,
    platform: new ActionPlatform(ctx, loaded.context),
    sandbox: new RemoteSandbox(
      ctx,
      loaded.input.run._id,
      loaded.context.run.sandboxId
    ),
  }
}
