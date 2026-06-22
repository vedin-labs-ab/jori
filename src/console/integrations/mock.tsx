import { type ReactNode, useState } from "react"
import { FullscreenSkeletonLoader } from "@/console/shared/loading"
import { IntegrationSetupOutcome } from "./outcome"

type SetupPreviewState = "connecting" | "connected" | "expired" | "failed"

const previewStates = ["connecting", "connected", "failed", "expired"] as const

export function IntegrationSetupMock() {
  const [state, setState] = useState<SetupPreviewState>("connecting")
  const controls = <PreviewControls state={state} setState={setState} />

  if (state === "connected") {
    return (
      <PreviewFrame controls={controls}>
        <IntegrationSetupOutcome variant="connected" />
      </PreviewFrame>
    )
  }

  if (state === "expired") {
    return (
      <PreviewFrame controls={controls}>
        <IntegrationSetupOutcome variant="expired" />
      </PreviewFrame>
    )
  }

  if (state === "connecting") {
    return <ConnectingSetupPreview controls={controls} />
  }

  return (
    <PreviewFrame controls={controls}>
      <IntegrationSetupOutcome onRetry={() => undefined} variant="failed" />
    </PreviewFrame>
  )
}

function ConnectingSetupPreview({ controls }: { controls: ReactNode }) {
  return (
    <PreviewFrame controls={controls}>
      <FullscreenSkeletonLoader />
    </PreviewFrame>
  )
}

function PreviewFrame({
  children,
  controls,
}: {
  children: ReactNode
  controls: ReactNode
}) {
  return (
    <>
      {children}
      <div className="fixed right-4 bottom-4 z-[60]">{controls}</div>
    </>
  )
}

function PreviewControls({
  setState,
  state,
}: {
  setState: (state: SetupPreviewState) => void
  state: SetupPreviewState
}) {
  return (
    <div className="inline-flex w-fit rounded-md border bg-muted p-1">
      {previewStates.map((previewState) => (
        <button
          className={[
            "rounded-sm px-3 py-1 font-medium text-sm transition-colors",
            previewState === state
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          key={previewState}
          onClick={() => setState(previewState)}
          type="button"
        >
          {previewState}
        </button>
      ))}
    </div>
  )
}
