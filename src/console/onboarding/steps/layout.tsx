import { type ReactNode } from "react"
import { type DiscoveryStepLayout } from "../../context/organization/discovery/website"

/** One onboarding step on the page: what it asks, the fields if any, then
 *  the way forward ahead of the way around. Onboarding has no header, so
 *  the step's title is the page's heading. */
export function OnboardingStep({
  title,
  description,
  children,
  primary,
  secondary,
}: {
  title: string
  description: string
  children?: ReactNode
  primary: ReactNode
  secondary?: ReactNode
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-medium text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
      {children}
      <div className="flex items-center gap-2">
        {primary}
        {secondary}
      </div>
    </div>
  )
}

OnboardingStep satisfies DiscoveryStepLayout
