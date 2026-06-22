import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Plug,
  RotateCcw,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { RootStateFrame } from "@/shared/state"

type SetupPreviewState = "connecting" | "connected" | "error"

const previewStates = ["connecting", "connected", "error"] as const

export function IntegrationSetupMock() {
  const [state, setState] = useState<SetupPreviewState>("connecting")
  const controls = <PreviewControls state={state} setState={setState} />

  if (state === "connected") {
    return <ConnectedSetupPreview controls={controls} />
  }

  if (state === "error") {
    return <ErrorSetupPreview controls={controls} />
  }

  return <ConnectingSetupPreview controls={controls} />
}

function ConnectedSetupPreview({ controls }: { controls: ReactNode }) {
  return (
    <RootStateFrame
      action={
        <Button asChild variant="outline">
          <a href="/integrations">View integrations</a>
        </Button>
      }
      description="GitHub is connected and available to Milo."
      icon={<CheckCircle2 />}
      title="Integration connected"
    >
      {controls}
    </RootStateFrame>
  )
}

function ErrorSetupPreview({ controls }: { controls: ReactNode }) {
  return (
    <RootStateFrame
      action={
        <Button type="button">
          <RotateCcw />
          Try again
        </Button>
      }
      description="The provider did not finish connecting. Try again when ready."
      icon={<AlertTriangle />}
      title="Setup link needs attention"
    >
      {controls}
    </RootStateFrame>
  )
}

function ConnectingSetupPreview({ controls }: { controls: ReactNode }) {
  return (
    <RootStateFrame
      action={
        <Button disabled type="button">
          <LoaderCircle className="animate-spin" />
          Opening provider
        </Button>
      }
      description="Milo is preparing the authorization request for GitHub."
      icon={<LoaderCircle className="animate-spin" />}
      title="Connecting GitHub"
    >
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Plug className="size-4" />
        GitHub requested from Slack
      </div>
      {controls}
    </RootStateFrame>
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
