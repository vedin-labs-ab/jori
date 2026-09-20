import { Button } from "@/components/ui/button"
import { ProviderLogo } from "@/shared/logo/provider"
import { OnboardingStep } from "./step"

/** The tools most teams connect first, as the closing step shows them. */
const tools = [
  "slack",
  "github",
  "linear",
  "notion",
  "gmail",
  "googleCalendar",
] as const

/** Where onboarding ends: the organization is set up, the first thing to do
 *  with it is one click away, and the tools that make Jori more useful are
 *  the other. Connecting opens a provider's own window, so it is offered as
 *  a way on instead of a step to sit through. */
export function DoneStep({
  onChat,
  onIntegrations,
  organization,
}: {
  onChat: () => void
  onIntegrations: () => void
  organization: string
}) {
  return (
    <OnboardingStep
      description="Start with a chat. Tell Jori about something you do by hand, and turn it into a job that runs without you."
      primary={
        <Button autoFocus onClick={onChat}>
          Start a chat
        </Button>
      }
      secondary={
        <Button onClick={onIntegrations} variant="ghost">
          Connect your tools
        </Button>
      }
      title={`${organization} is ready.`}
    >
      <div className="grid gap-2">
        <ul aria-label="Tools Jori works with" className="flex gap-1.5">
          {tools.map((tool, index) => (
            <li
              className="flex size-8 items-center justify-center rounded-md border bg-card motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:animate-in motion-safe:fill-mode-both motion-safe:duration-300"
              key={tool}
              // The row arrives one tile after another, 50 ms apart.
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <ProviderLogo className="size-4" surface={tool} />
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Jori does more where your team already works. Connect Slack, GitHub,
          Linear, and the rest whenever you like.
        </p>
      </div>
    </OnboardingStep>
  )
}
