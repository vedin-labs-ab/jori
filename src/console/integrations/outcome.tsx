import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"

type SetupOutcomeVariant = "connected" | "expired" | "failed" | "terminal"

const setupOutcomeContent: Record<
  SetupOutcomeVariant,
  {
    description: string
    icon: ReactNode
    title: string
  }
> = {
  connected: {
    description: "This integration is connected and available to Milo.",
    icon: <CheckCircle2 />,
    title: "Integration connected",
  },
  expired: {
    description:
      "Ask Milo for a new setup link, or open integrations to connect manually.",
    icon: <AlertTriangle />,
    title: "Setup link expired",
  },
  failed: {
    description: "We couldn't finish connecting. Try again when you're ready.",
    icon: <AlertTriangle />,
    title: "Connection failed",
  },
  terminal: {
    description:
      "Milo couldn't open this setup link. Open integrations to connect manually.",
    icon: <AlertTriangle />,
    title: "Setup link unavailable",
  },
}

export function IntegrationSetupOutcome({
  onRetry,
  variant,
}: {
  onRetry?: () => void
  variant: SetupOutcomeVariant
}) {
  const content = setupOutcomeContent[variant]

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-10">
      <section className="grid w-full max-w-sm justify-items-center gap-5 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground *:size-5">
          {content.icon}
        </div>
        <div className="grid gap-2">
          <h1 className="text-2xl font-medium tracking-normal">
            {content.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {content.description}
          </p>
        </div>
        <SetupOutcomeActions onRetry={onRetry} variant={variant} />
      </section>
    </main>
  )
}

function SetupOutcomeActions({
  onRetry,
  variant,
}: {
  onRetry?: () => void
  variant: SetupOutcomeVariant
}) {
  const hasRetry = variant === "failed" && onRetry !== undefined

  return (
    <div className="grid justify-items-center gap-2">
      {hasRetry ? (
        <Button onClick={onRetry} type="button">
          <RotateCcw />
          Try again
        </Button>
      ) : (
        <Button asChild>
          <a href="/integrations">View integrations</a>
        </Button>
      )}
      {hasRetry ? (
        <Button asChild variant="link">
          <a href="/integrations">Back to integrations</a>
        </Button>
      ) : null}
    </div>
  )
}
