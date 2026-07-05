import { toast } from "sonner"

export function showErrorToast(error: unknown, fallback: string) {
  toast.error(readErrorMessage(error, fallback))
}

export function readErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback
  }

  const message = cleanErrorMessage(error.message)

  if (message === "" || isRawImplementationError(message)) {
    return fallback
  }

  return message
}

function cleanErrorMessage(message: string) {
  const uncaught = message.match(/Uncaught Error: ([\s\S]+)/)
  const cleaned = (uncaught?.[1] ?? message).trim()

  return cleaned.split("\n")[0]?.trim() ?? ""
}

function isRawImplementationError(message: string) {
  return (
    message.includes("Provider API request failed") ||
    message.includes("ConvexError") ||
    message.includes("Request ID:") ||
    message.includes("Server Error")
  )
}
