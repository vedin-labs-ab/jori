import { MessageCircleMore } from "lucide-react"
import { useEffect, useState } from "react"
import { CodeBlockDetail, StatusDetail } from "./details"

type PromptState =
  | { status: "missing" }
  | { status: "loading" }
  | { status: "loaded"; text: string }
  | { status: "failed" }

export function PromptDetail({ promptUrl }: { promptUrl: string | undefined }) {
  const prompt = useStoredPrompt(promptUrl)

  if (prompt.status === "loaded") {
    return (
      <CodeBlockDetail
        contentClassName="max-h-96 overflow-y-auto"
        icon={MessageCircleMore}
        label="Prompt"
        value={prompt.text}
      />
    )
  }

  return (
    <StatusDetail
      icon={MessageCircleMore}
      iconClassName={
        prompt.status === "failed" ? "text-destructive" : undefined
      }
      label="Prompt"
      value={promptStatusText(prompt.status)}
    />
  )
}

function useStoredPrompt(promptUrl: string | undefined) {
  const [prompt, setPrompt] = useState<PromptState>(
    promptUrl === undefined ? { status: "missing" } : { status: "loading" }
  )

  useEffect(() => {
    if (promptUrl === undefined) {
      setPrompt({ status: "missing" })
      return
    }

    const controller = new AbortController()
    let isActive = true

    setPrompt({ status: "loading" })

    void fetch(promptUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Stored prompt request failed.")
        }

        return response.text()
      })
      .then((text) => {
        if (isActive) {
          setPrompt({ status: "loaded", text })
        }
      })
      .catch((error: unknown) => {
        if (isActive && !isAbortError(error)) {
          setPrompt({ status: "failed" })
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [promptUrl])

  return prompt
}

function promptStatusText(status: Exclude<PromptState["status"], "loaded">) {
  if (status === "loading") {
    return "Loading prompt..."
  }

  if (status === "missing") {
    return "Prompt file is missing."
  }

  return "Prompt could not be loaded."
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}
