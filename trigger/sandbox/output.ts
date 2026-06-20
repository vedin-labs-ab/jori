export const defaultOutputLimit = 20_000

export type BoundedText = {
  text: string
  truncated: boolean
}

export function boundedText(
  value: string,
  limit = defaultOutputLimit
): BoundedText {
  if (value.length <= limit) {
    return { text: value, truncated: false }
  }

  return {
    text: value.slice(0, limit),
    truncated: true,
  }
}

export function compactFailure(input: {
  exitCode: number
  stderr: string
  stdout: string
}) {
  const output = [input.stdout, input.stderr]
    .filter((value) => value.trim() !== "")
    .join("\n")
  const bounded = boundedText(output)

  return bounded.text === ""
    ? `Command failed with exit code ${input.exitCode}.`
    : bounded.text
}
