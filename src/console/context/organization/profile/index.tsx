import { Building2, Loader2, Pencil, Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { OrganizationEditDialog } from "../discovery/edit"
import {
  hasFacts,
  isFactPresent,
  type OrganizationDiscovery,
  type OrganizationProfile,
  type OrganizationSources,
} from "../types"
import { FactsBody } from "./facts"
import { ProposalReview } from "./proposal"
import { SourcesSection, WebsitesSection } from "./sources"

export function ContextProfile({
  organizationId,
  website,
  discovery,
  profile,
  sources,
}: {
  organizationId: string
  website: string | undefined
  discovery: OrganizationDiscovery | undefined
  profile: OrganizationProfile | undefined
  sources: OrganizationSources | undefined
}) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  if (profile === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  const facts = profile === null || !hasFacts(profile) ? null : profile
  const extracting = discovery?.status === "running"
  const title =
    facts !== null && isFactPresent(facts.name) ? facts.name : "Organization"

  return (
    <>
      <Card className="gap-0 py-0 ring-inset">
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="grid gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-muted-foreground text-xs/relaxed">
              {approvalDescription(profile)}
            </p>
          </div>
          <Button
            onClick={() => setEditorOpen(true)}
            type="button"
            variant="outline"
          >
            <ContextActionContent
              extracting={extracting}
              isEmpty={facts === null}
            />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 pt-0 sm:p-5 sm:pt-0">
          {profile?.proposed === undefined ? null : (
            <ProposalReview
              current={facts}
              onOpenChange={setReviewOpen}
              open={reviewOpen}
              primaryWebsite={website}
              proposed={profile.proposed}
              sources={sources}
              organizationId={organizationId}
            />
          )}
          {facts === null ? (
            <EmptyProfile />
          ) : (
            <FactsBody facts={facts} showName={false} />
          )}
          <ProfileSections
            facts={facts}
            profile={profile}
            sources={sources}
            organizationId={organizationId}
            website={website}
          />
        </CardContent>
      </Card>
      {editorOpen ? (
        <OrganizationEditDialog
          organizationId={organizationId}
          website={website}
          discovery={discovery}
          onOpenChange={setEditorOpen}
          onReviewProfile={() => {
            setEditorOpen(false)
            setReviewOpen(true)
          }}
        />
      ) : null}
    </>
  )
}

function ProfileSections({
  facts,
  profile,
  sources,
  organizationId,
  website,
}: {
  facts: NonNullable<OrganizationProfile> | null
  profile: OrganizationProfile
  sources: OrganizationSources | undefined
  organizationId: string
  website: string | undefined
}) {
  const hasSources = sources === undefined || sources.length > 0

  return (
    <>
      <WebsitesSection
        declared={profile?.declared?.domains ?? []}
        domains={facts?.domains ?? []}
        primaryWebsite={website}
        organizationId={organizationId}
      />
      {hasSources ? (
        <>
          <Separator />
          <SourcesSection sources={sources} />
        </>
      ) : null}
    </>
  )
}

function ContextActionContent({
  extracting,
  isEmpty,
}: {
  extracting: boolean
  isEmpty: boolean
}) {
  if (extracting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        Extracting
      </>
    )
  }

  if (isEmpty) {
    return (
      <>
        <Plus className="text-muted-foreground" />
        Add
      </>
    )
  }

  return (
    <>
      <Pencil className="text-muted-foreground" />
      Edit
    </>
  )
}

function EmptyProfile() {
  return (
    <Empty className="min-h-32 rounded-md">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>No organization context</EmptyTitle>
        <EmptyDescription>
          Add your website to discover and approve facts Jori can use in every
          run.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function approvalDescription(profile: OrganizationProfile | null) {
  if (profile === null || profile.approvedAt === undefined) {
    return "Approved facts are added to every run as context."
  }

  const date = formatDate(profile.approvedAt)
  const approver = approvalActorName(profile.approvedBy)

  return approver === undefined
    ? `Approved on ${date}`
    : `Approved by ${approver} on ${date}`
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

type ApprovalActor = NonNullable<NonNullable<OrganizationProfile>["approvedBy"]>

function approvalActorName(actor: ApprovalActor | undefined) {
  if (actor === undefined) {
    return undefined
  }

  if ("externalId" in actor) {
    return actor.kind === "self" ? "Jori" : (actor.name ?? actor.email)
  }

  return "personId" in actor ? (actor.name ?? actor.email) : actor.email
}
