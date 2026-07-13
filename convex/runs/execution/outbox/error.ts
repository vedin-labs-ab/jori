const maxErrorLength = 2000

export function formatRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return message.length > maxErrorLength
    ? `${message.slice(0, maxErrorLength)}...`
    : message
}
