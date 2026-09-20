import { useCallback, useSyncExternalStore } from "react"

export function localTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// One clock per period, shared by everything that reads it. A list tells
// its times a row at a time, and with a timer in every row a long folder
// woke a thousand of them every half minute.
type Clock = {
  listeners: Set<() => void>
  now: number
  timer: ReturnType<typeof setInterval> | undefined
}

const clocks = new Map<number, Clock>()

function clockFor(intervalMs: number) {
  let clock = clocks.get(intervalMs)

  if (clock === undefined) {
    clock = { listeners: new Set(), now: Date.now(), timer: undefined }
    clocks.set(intervalMs, clock)
  }

  return clock
}

function subscribe(intervalMs: number, listener: () => void) {
  const clock = clockFor(intervalMs)

  // A clock read in a render that never mounted has had no one to tick it.
  if (clock.timer === undefined && Date.now() - clock.now > 1000) {
    clock.now = Date.now()
  }

  clock.listeners.add(listener)
  clock.timer ??= setInterval(() => {
    clock.now = Date.now()

    for (const notify of clock.listeners) {
      notify()
    }
  }, intervalMs)

  return () => {
    clock.listeners.delete(listener)

    // The last reader takes the clock with it, so the next one starts
    // from the present rather than from when this one stopped.
    if (clock.listeners.size === 0) {
      clearInterval(clock.timer)
      clocks.delete(intervalMs)
    }
  }
}

/** The present, refreshed every `intervalMs`. */
export function useNow(intervalMs: number) {
  return useSyncExternalStore(
    useCallback(
      (listener: () => void) => subscribe(intervalMs, listener),
      [intervalMs]
    ),
    () => clockFor(intervalMs).now,
    // A server has no readers to tick a clock, so it tells the time fresh,
    // held still for the length of a render by rounding to the period.
    () => Math.floor(Date.now() / intervalMs) * intervalMs
  )
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

/** With the year, for a date far enough out to cross into the next one. */
export function longDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
    timestamp
  )
}

export function absoluteTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp)
}

export function expirationLabel(expiresAt: number, now: number) {
  if (now >= expiresAt) {
    return `Expired at ${absoluteTime(expiresAt)}`
  }

  return `Expires in ${formatDuration(Math.max(0, expiresAt - now))}`
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
