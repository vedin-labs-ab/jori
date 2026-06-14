type RunSnapshot = {
  task: string
  title: string
}

export function createAutomationRunSnapshot(input: {
  instructions: string
  name: string
}): RunSnapshot {
  return {
    title: normalizeRequiredRunText(input.name, "Run title"),
    task: normalizeRequiredRunText(input.instructions, "Run task"),
  }
}

export function createMessageRunSnapshot(input: { text: string }): RunSnapshot {
  const task = normalizeRequiredRunText(input.text, "Run task")

  return {
    title: firstLine(task),
    task,
  }
}

function firstLine(text: string) {
  const line = text.split("\n").find(Boolean)

  if (line === undefined) {
    throw new Error("Run title cannot be empty.")
  }

  return line.length > 90 ? `${line.slice(0, 87)}...` : line
}

function normalizeRequiredRunText(text: string, label: string) {
  const value = text.trim()

  if (value === "") {
    throw new Error(`${label} cannot be empty.`)
  }

  return value
}
