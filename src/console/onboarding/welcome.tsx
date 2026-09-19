import { Button } from "@/components/ui/button"
import { OnboardingStep } from "./step"

export function WelcomeStep({
  name,
  onStart,
  organization,
}: {
  name: string | undefined
  onStart: () => void
  organization: string
}) {
  return (
    <OnboardingStep
      description="Jori is a shared drive for the work you hand to AI. Describe a job in plain words, say when it runs, and it runs."
      primary={
        <Button autoFocus onClick={onStart}>
          Get started
        </Button>
      }
      title={
        name === undefined ? "Welcome to Jori." : `Welcome to Jori, ${name}.`
      }
    >
      <p className="text-sm leading-relaxed">
        First, tell Jori about {organization}. It takes about a minute.
      </p>
    </OnboardingStep>
  )
}
