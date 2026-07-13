export function formatSlackTime(timestamp: number) {
  const fallback = new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return `<!date^${timestamp}^{time}|${fallback}>`
}

export function toSlackTimestamp(timestampMs: number) {
  return Math.floor(timestampMs / 1000)
}

export function truncateSlackText(value: string, maximumLength: number) {
  return value.length <= maximumLength
    ? value
    : `${value.slice(0, maximumLength - 3)}...`
}
