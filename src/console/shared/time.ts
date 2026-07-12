import { useEffect, useState } from "react"

export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000))

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return remainingSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`
}

export function relativeTime(timestamp: number, now: number) {
  if (timestamp > now) {
    return futureRelativeTime(timestamp, now)
  }

  const seconds = Math.round((now - timestamp) / 1000)

  if (seconds < 60) {
    return "just now"
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  return days === 1 ? "Yesterday" : `${days}d ago`
}

function futureRelativeTime(timestamp: number, now: number) {
  const seconds = Math.round((timestamp - now) / 1000)

  if (seconds < 60) {
    return "in under a minute"
  }

  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const amount =
    minutes < 60 ? `${minutes}m` : hours < 24 ? `${hours}h` : `${days}d`

  return `in ${amount}`
}

export function shortDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(timestamp)
}

export function absoluteTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp)
}

export function absoluteUtcTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(timestamp)
}
