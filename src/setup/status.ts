import { useEffect, useState } from "react"

export function useSlackCallbackStatus() {
  const [status, setStatus] = useState<"connected" | "error" | null>(null)

  useEffect(() => {
    setStatus(getSlackCallbackStatus())
  }, [])

  return status
}

function getSlackCallbackStatus() {
  const value = new URLSearchParams(window.location.search).get("slack")

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
