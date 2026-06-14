import { providerLabel } from "../../providers/catalog"
import { type getExecutionContext } from "./context"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export function executionTitle(context: ExecutionContext) {
  return context.run.title
}

export function executionTask(context: ExecutionContext) {
  return context.run.task
}

export function triggerLabel(context: ExecutionContext) {
  const run = context.run

  if (run.reason.type === "time") {
    return "Time automation"
  }

  if (run.reason.type === "event") {
    return `${providerLabel(requireEvent(context).provider)} event`
  }

  if (run.reason.type === "message") {
    return `${providerLabel(requireMessage(context).provider)} message`
  }

  return "Manual run"
}

function requireEvent(context: ExecutionContext) {
  if (context.event === null) {
    throw new Error("Run event is missing.")
  }

  return context.event
}

function requireMessage(context: ExecutionContext) {
  if (context.message === null) {
    throw new Error("Run message is missing.")
  }

  return context.message
}
