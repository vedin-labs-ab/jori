import { urlEpoch, urlWindowMs } from "@contracts/runtime/files"
import { useEffect, useRef, useState } from "react"

/** The current URL window, advancing as each one ends. Passed to every
 *  query that returns signed file URLs, so a mounted view trades its URLs
 *  for fresh ones before they expire. */
export function useUrlEpoch() {
  const [epoch, setEpoch] = useState(() => urlEpoch(Date.now()))

  useEffect(() => {
    const timer = setTimeout(
      () => setEpoch(urlEpoch(Date.now())),
      (epoch + 1) * urlWindowMs - Date.now()
    )

    return () => clearTimeout(timer)
  }, [epoch])

  return epoch
}

/** Holds the previous window's result while the next one loads, so a new
 *  epoch never flashes a loading state. `subject` names what was asked for:
 *  a result is only held for the same subject. */
export function useAcrossEpochs<Value>(
  value: Value | undefined,
  subject: string
) {
  const last = useRef({ subject, value })

  if (value !== undefined || last.current.subject !== subject) {
    last.current = { subject, value }
  }

  return last.current.value
}
