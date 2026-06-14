import { providerLabel } from "../../providers/catalog"
import { type getExecutionContext } from "./context"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export function executionTitle(context: ExecutionContext) {
  return context.run?.title ?? context.approval?.handoff.objective ?? "Run"
}

export function executionTask(context: ExecutionContext, fallback: string) {
  const task = context.run?.task?.trim()

  return task === undefined || task === "" ? fallback : task
}

export function triggerLabel(context: ExecutionContext) {
  const run = context.run

  if (run?.reason.type === "time") {
    return "Time automation"
  }

  if (run?.reason.type === "event") {
    return `${providerLabel(context.event?.provider ?? context.integration?.provider)} event`
  }

  if (run?.reason.type === "message") {
    return `${providerLabel(context.message?.provider ?? context.integration?.provider)} message`
  }

  return "Manual run"
}
