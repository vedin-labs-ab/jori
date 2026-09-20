import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { countLabel } from "@/shared/console/count"
import { showErrorToast } from "@/shared/console/error"
import { sourceLabel } from "../context/organization/discovery/url"
import { type ContextProposal } from "../context/organization/types"
import { OnboardingStep } from "./step"

/** What Jori drafted from the website, as plain fields to correct. Nothing
 *  is kept until the person says it is right; skipping leaves the draft
 *  waiting on the Context page, where it can be reviewed or discarded. */
export function ProfileStep({
  onApprove,
  onSkip,
  organization,
  proposal,
}: {
  onApprove: (edits: { name: string; summary: string }) => Promise<void>
  onSkip: () => void
  organization: string
  proposal: ContextProposal
}) {
  const [name, setName] = useState(proposal.name ?? organization)
  const [summary, setSummary] = useState(proposal.summary ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const approve = async () => {
    setIsSaving(true)

    try {
      await onApprove({ name, summary })
    } catch (caught) {
      showErrorToast(caught, "Couldn't save the profile. Try again.")
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void approve()
      }}
    >
      <OnboardingStep
        description={`${readFrom(proposal)} Fix anything that's off. Jori starts every job from this.`}
        primary={
          <Button disabled={isSaving} type="submit">
            {isSaving ? <Spinner /> : null}
            Looks right
          </Button>
        }
        secondary={
          <Button
            disabled={isSaving}
            onClick={onSkip}
            type="button"
            variant="ghost"
          >
            Skip for now
          </Button>
        }
        title={`Does this sound like ${organization}?`}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="onboarding-profile-name">Name</Label>
            <Input
              disabled={isSaving}
              id="onboarding-profile-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="onboarding-profile-summary">What you do</Label>
            <Textarea
              className="min-h-32"
              disabled={isSaving}
              id="onboarding-profile-summary"
              onChange={(event) => setSummary(event.target.value)}
              value={summary}
            />
          </div>
        </div>
      </OnboardingStep>
    </form>
  )
}

/** Where the draft came from, said plainly: how much Jori read, and where. */
function readFrom(proposal: ContextProposal) {
  const pages = proposal.sources?.length ?? 0
  // The site by name: a root address reads without its trailing slash.
  const site =
    proposal.website === undefined
      ? undefined
      : sourceLabel(proposal.website).replace(/\/$/, "")

  if (pages === 0) {
    return site === undefined
      ? "Jori drafted this from your website."
      : `Jori drafted this from ${site}.`
  }

  return site === undefined
    ? `Jori drafted this from ${countLabel(pages, "page")}.`
    : `Jori drafted this from ${countLabel(pages, "page")} on ${site}.`
}
