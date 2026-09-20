import { Button } from "@/components/ui/button"
import { OnboardingStep } from "./step"

/** Where onboarding ends: the organization is set up, and the first thing
 *  to do with it is one click away. */
export function DoneStep({
  onChat,
  onReview,
  organization,
}: {
  onChat: () => void
  /** Opens the profile Jori drafted, when there is one. */
  onReview?: () => void
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
        onReview === undefined ? undefined : (
          <Button onClick={onReview} variant="ghost">
            Review your profile
          </Button>
        )
      }
      title={`${organization} is ready.`}
    />
  )
}
