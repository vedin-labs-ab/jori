import { Link } from "@tanstack/react-router"
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { RootStateFrame } from "@/shared/state"

type OfferOutcomeVariant = "connected" | "expired" | "failed" | "terminal"

const offerOutcomeContent: Record<
  OfferOutcomeVariant,
  {
    description: string
    icon: ReactNode
    title: string
  }
> = {
  connected: {
    description: "This integration is connected and available to Jori.",
    icon: <CheckCircle2 />,
    title: "Integration connected",
  },
  expired: {
    description:
      "Ask Jori for a new integration offer, or open integrations to connect manually.",
    icon: <AlertTriangle />,
    title: "Integration offer expired",
  },
  failed: {
    description: "We couldn't finish connecting. Try again when you're ready.",
    icon: <AlertTriangle />,
    title: "Integration failed",
  },
  terminal: {
    description:
      "Jori couldn't open this integration offer. Open integrations to connect manually.",
    icon: <AlertTriangle />,
    title: "Integration offer unavailable",
  },
}

export function IntegrationOfferOutcome({
  onRetry,
  variant,
}: {
  onRetry?: () => void
  variant: OfferOutcomeVariant
}) {
  const content = offerOutcomeContent[variant]

  return (
    <RootStateFrame
      title={content.title}
      description={content.description}
      icon={content.icon}
      action={<OfferOutcomeActions onRetry={onRetry} variant={variant} />}
    />
  )
}

function OfferOutcomeActions({
  onRetry,
  variant,
}: {
  onRetry?: () => void
  variant: OfferOutcomeVariant
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
          <Link to="/integrations">View integrations</Link>
        </Button>
      )}
      {hasRetry ? (
        <Button asChild variant="link">
          <Link to="/integrations">Back to integrations</Link>
        </Button>
      ) : null}
    </div>
  )
}
