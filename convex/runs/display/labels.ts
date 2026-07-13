import { type Doc } from "../../_generated/dataModel"
import { toolSurfaceLabel } from "../../shared/integrations"

type RunLabelContext = {
  automation?: Doc<"automations"> | null
  message?: Doc<"messages"> | null
  run: Doc<"runs">
}

export function runTitle(context: RunLabelContext) {
  return context.run.snapshot.title
}

export function runTask(context: RunLabelContext) {
  return (
    context.run.instructions ??
    context.message?.text ??
    context.automation?.instructions ??
    context.run.snapshot.title
  )
}

export function triggerLabel(context: RunLabelContext) {
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

  return context.run.parentId === undefined ? "Manual" : "Agent"
}
