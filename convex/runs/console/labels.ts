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
  return context.run.snapshot.trigger
}
