import { type getExecutionContext } from "./context"

type ExecutionContext = Awaited<ReturnType<typeof getExecutionContext>>

export function executionTitle(context: ExecutionContext) {
  return context.run.title
}

export function executionTask(context: ExecutionContext) {
  return context.run.task
}

export function triggerLabel(context: ExecutionContext) {
  return context.run.display.trigger
}
