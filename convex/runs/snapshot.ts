type RunSnapshot = {
  task: string
  title: string
}

export function createAutomationRunSnapshot(input: {
  instructions: string
  name: string
}): RunSnapshot {
  const title = normalizeRunText(input.name) ?? "Automation run"

  return {
    title,
    task: normalizeRunText(input.instructions) ?? title,
  }
}

export function createMessageRunSnapshot(input: {
  text: string | undefined
}): RunSnapshot {
  const task = normalizeRunText(input.text) ?? "Message run"

  return {
    title: firstLine(task) ?? "Message run",
    task,
  }
}

function firstLine(text: string) {
  const line = text.trim().split("\n").find(Boolean)

  if (line === undefined) {
    return undefined
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}

function normalizeRunText(text: string | undefined) {
  const value = text?.trim()

  return value === "" ? undefined : value
}
