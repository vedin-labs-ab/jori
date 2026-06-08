export function getSlackCallbackStatus() {
  if (typeof window === "undefined") {
    return null
  }

  const value = new URLSearchParams(window.location.search).get("slack")

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
