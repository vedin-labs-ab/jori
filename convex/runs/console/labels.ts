import { toolSurfaceLabel } from "../../shared/integrations"
import { type getRunContext } from "./context"

type RunContext = Awaited<ReturnType<typeof getRunContext>>

export function runTitle(context: RunContext) {
  return context.run.snapshot.title
}

export function runTask(context: RunContext) {
  return (
    context.run.instructions ??
    context.message?.text ??
    context.automation?.instructions ??
    context.run.snapshot.title
  )
}

export function triggerLabel(context: RunContext) {
  const surface = context.run.snapshot.source.surface

  if (context.run.cause.type === "message") {
    return `${surface === undefined ? "Provider" : toolSurfaceLabel(surface)} message`
  }

  if (context.run.cause.type === "event") {
    return `${surface === undefined ? "Provider" : toolSurfaceLabel(surface)} event`
  }

  if (context.run.cause.type === "time") {
    return "Time automation"
  }

  return context.run.parentId === undefined ? "Manual" : "Subagent"
}
