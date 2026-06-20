import { type getRunContext } from "./context"

type RunContext = Awaited<ReturnType<typeof getRunContext>>

export function runTitle(context: RunContext) {
  return context.run.title
}

export function runTask(context: RunContext) {
  return context.run.task
}

export function triggerLabel(context: RunContext) {
  return context.run.display.trigger
}
