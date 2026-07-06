// Debounce with a hard ceiling: every new signal pushes the run out by the
// debounce, but never past the ceiling set when the quiet period began, so a
// steady stream still flushes on time.
export type DebounceSchedule = {
  runAt: number
  ceilingAt: number
}

export function nextDebounceSchedule(args: {
  now: number
  ceilingAt: number | undefined
  debounceMs: number
  maxDelayMs: number
}): DebounceSchedule {
  const ceilingAt = args.ceilingAt ?? args.now + args.maxDelayMs

  return {
    runAt: Math.min(args.now + args.debounceMs, ceilingAt),
    ceilingAt,
  }
}
