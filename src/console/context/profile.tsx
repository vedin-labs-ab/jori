import { useAction, useMutation } from "convex/react"
import { Loader2, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { FactsBody } from "./facts"
import { DiscoveryProgress } from "./progress"
import { SourcesSection, WebsitesSection } from "./sources"
import {
  type ContextFacts,
  hasFacts,
  type OrganizationDiscovery,
  type OrganizationProfile,
  type OrganizationSources,
} from "./types"
import { DiscoveryWorkingStep, WebsiteDiscoveryStep } from "./website"

export function ContextProfile({
  tenantId,
  website,
  discovery,
  profile,
  sources,
}: {
  tenantId: string
  website: string | undefined
  discovery: OrganizationDiscovery | undefined
  profile: OrganizationProfile | undefined
  sources: OrganizationSources | undefined
}) {
  const [editorOpen, setEditorOpen] = useState(false)

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  const facts = profile === null || !hasFacts(profile) ? null : profile
  const hasSources = sources === undefined || sources.length > 0

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-5 sm:px-8">
          <div className="grid gap-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Organization
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {approvalDescription(profile)}
            </p>
          </div>
          <Button
            onClick={() => setEditorOpen(true)}
            type="button"
            variant="outline"
          >
            Edit
          </Button>
        </CardHeader>
        <CardContent className="grid gap-7 px-6 py-7 sm:px-8">
          <DiscoveryPanel discovery={discovery} />
          {profile?.proposed === undefined ? null : (
            <ProposedPanel tenantId={tenantId} proposed={profile.proposed} />
          )}
          {facts === null ? <EmptyProfile /> : <FactsBody facts={facts} />}
          <WebsitesSection
            domains={facts?.domains ?? []}
            primaryWebsite={website}
          />
          {hasSources ? (
            <>
              <Separator />
              <SourcesSection sources={sources} />
            </>
          ) : null}
        </CardContent>
      </Card>
      {editorOpen ? (
        <OrganizationEditDialog
          tenantId={tenantId}
          website={website}
          discovery={discovery}
          onOpenChange={setEditorOpen}
        />
      ) : null}
    </>
  )
}

function ProposedPanel({
  tenantId,
  proposed,
}: {
  tenantId: string
  proposed: ContextFacts
}) {
  const approve = useMutation(api.organization.profile.approve)
  const [approving, setApproving] = useState(false)

  const onApprove = async () => {
    setApproving(true)

    try {
      await approve({ tenantId })
    } finally {
      setApproving(false)
    }
  }

  return (
    <section className="grid gap-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <h3 className="font-semibold">Proposed update</h3>
          <p className="text-sm text-muted-foreground">
            Review the latest extraction before it is added to agent context.
          </p>
        </div>
        <Button onClick={() => void onApprove()} disabled={approving}>
          {approving ? <Loader2 className="size-4 animate-spin" /> : null}
          {approving ? "Approving" : "Approve"}
        </Button>
      </div>
      <FactsBody facts={proposed} />
    </section>
  )
}

function DiscoveryPanel({
  discovery,
}: {
  discovery: OrganizationDiscovery | undefined
}) {
  if (
    discovery === undefined ||
    discovery === null ||
    discovery.status === "succeeded"
  ) {
    return null
  }

  const running = discovery.status === "running"

  return (
    <section className="grid gap-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        {running ? (
          <Loader2 className="mt-0.5 size-4 animate-spin text-muted-foreground" />
        ) : (
          <TriangleAlert className="mt-0.5 size-4 text-destructive" />
        )}
        <div className="grid gap-1">
          <h3 className="font-semibold">
            {running ? "Exploring your website" : "Discovery did not finish"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {running
              ? "Reading your site and drafting an organization profile."
              : (discovery.error ?? "Something went wrong.")}
          </p>
        </div>
      </div>
      <DiscoveryProgress discovery={discovery} />
    </section>
  )
}

function OrganizationEditDialog({
  tenantId,
  website,
  discovery,
  onOpenChange,
}: {
  tenantId: string
  website: string | undefined
  discovery: OrganizationDiscovery | undefined
  onOpenChange: (open: boolean) => void
}) {
  const discover = useAction(api.organization.onboarding.discover)
  const [step, setStep] = useState<"website" | "working">(
    discovery?.status === "running" ? "working" : "website"
  )
  const [value, setValue] = useState(website ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onContinue = async () => {
    setSubmitting(true)
    setError(null)

    try {
      await discover({ tenantId, website: value.trim() })
      setStep("working")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't start.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "website" ? (
          <WebsiteDiscoveryStep
            continueLabel="Run extraction"
            description="Change the main website Milo uses, then rerun extraction to draft updated organization facts."
            error={error}
            inputId="context-website"
            isSubmitting={submitting}
            onContinue={() => void onContinue()}
            onSkip={() => onOpenChange(false)}
            onWebsiteChange={setValue}
            skipLabel="Cancel"
            title="Edit main website"
            website={value}
          />
        ) : (
          <DiscoveryWorkingStep
            discovery={discovery}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EmptyProfile() {
  return (
    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      Add your website to discover your organization profile.
    </div>
  )
}

function approvalDescription(profile: OrganizationProfile | null) {
  if (profile === null || profile.approvedAt === undefined) {
    return "Approved facts are added to every run as context."
  }

  return `Approved ${formatDate(profile.approvedAt)}`
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
