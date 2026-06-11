export function absoluteTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp)
}

export function relativeTime(timestamp: number, now: number) {
  const isFuture = timestamp > now
  const seconds = Math.round(Math.abs(timestamp - now) / 1000)

  if (seconds < 60) {
    return isFuture ? "in under a minute" : "just now"
  }

  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const amount =
    minutes < 60 ? `${minutes}m` : hours < 24 ? `${hours}h` : `${days}d`

  return isFuture ? `in ${amount}` : `${amount} ago`
}

export function toDatetimeLocal(timestamp: number) {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, "0")
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
