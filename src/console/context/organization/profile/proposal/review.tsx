import { Separator } from "@/components/ui/separator"
import { websiteItems } from "../../discovery/url"
import {
  type ContextFacts,
  type ContextProposal,
  type ContextSource,
  isFactPresent,
  type OrganizationSources,
} from "../../types"
import { AliasesContent } from "../facts"
import { SourcesContent, WebsitesContent } from "../sources"
import {
  approvedFacts,
  type ProposalSectionStatus,
  proposalStatuses,
} from "./changes"
import { ReviewSection, SummaryContent } from "./section"

type ProposalReviewBodyProps = {
  current: ContextFacts | null
  primaryWebsite: string | undefined
  proposed: ContextProposal
  sources: OrganizationSources | undefined
}

export function ProposalReviewBody({
  current,
  primaryWebsite,
  proposed,
  sources,
}: ProposalReviewBodyProps) {
  const approved = approvedFacts(current)
  const proposedWebsite = proposed.website ?? primaryWebsite
  const proposedSources = proposed.sources ?? sources
  const statuses = proposalStatuses(current, proposed, {
    currentSources: sources,
    currentWebsite: primaryWebsite,
    proposedSources,
    proposedWebsite,
  })
  const currentWebsites = websiteItems(approved.domains, primaryWebsite)
  const proposedWebsites = websiteItems(proposed.domains, proposedWebsite)
  const hasSources =
    sources === undefined ||
    proposedSources === undefined ||
    sources.length + proposedSources.length > 0

  return (
    <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
      <OptionalSummary
        current={approved}
        proposed={proposed}
        status={statuses.summary}
      />
      <OptionalAliases
        current={approved}
        proposed={proposed}
        status={statuses.aliases}
      />
      <OptionalWebsites
        current={currentWebsites}
        proposed={proposedWebsites}
        status={statuses.websites}
      />
      {hasSources ? (
        <>
          <Separator />
          <OptionalSources
            current={sources}
            proposed={proposedSources}
            status={statuses.sources}
          />
        </>
      ) : null}
    </div>
  )
}

function OptionalSummary({
  current,
  proposed,
  status,
}: {
  current: ContextFacts
  proposed: ContextFacts
  status: ProposalSectionStatus
}) {
  if (!hasSummary(current) && !hasSummary(proposed)) {
    return null
  }

  return (
    <ReviewSection
      current={<SummaryContent facts={current} />}
      currentEmpty={!hasSummary(current)}
      proposed={<SummaryContent facts={proposed} />}
      proposedEmpty={!hasSummary(proposed)}
      status={status}
      title="Summary"
    />
  )
}

function OptionalAliases({
  current,
  proposed,
  status,
}: {
  current: ContextFacts
  proposed: ContextFacts
  status: ProposalSectionStatus
}) {
  if (current.aliases.length === 0 && proposed.aliases.length === 0) {
    return null
  }

  return (
    <ReviewSection
      current={<AliasesContent aliases={current.aliases} />}
      currentEmpty={current.aliases.length === 0}
      proposed={<AliasesContent aliases={proposed.aliases} />}
      proposedEmpty={proposed.aliases.length === 0}
      status={status}
      title="Also known as"
    />
  )
}

function OptionalSources({
  current,
  proposed,
  status,
}: {
  current: ContextSource[] | undefined
  proposed: ContextSource[] | undefined
  status: ProposalSectionStatus
}) {
  return (
    <ReviewSection
      count={proposed?.length}
      current={<SourcesContent sources={current} />}
      currentEmpty={current !== undefined && current.length === 0}
      proposed={<SourcesContent sources={proposed} />}
      proposedEmpty={proposed !== undefined && proposed.length === 0}
      status={status}
      title="Sources"
    />
  )
}

function OptionalWebsites({
  current,
  proposed,
  status,
}: {
  current: ReturnType<typeof websiteItems>
  proposed: ReturnType<typeof websiteItems>
  status: ProposalSectionStatus
}) {
  if (current.length === 0 && proposed.length === 0) {
    return null
  }

  return (
    <ReviewSection
      count={proposed.length}
      current={<WebsitesContent websites={current} />}
      currentEmpty={current.length === 0}
      proposed={<WebsitesContent websites={proposed} />}
      proposedEmpty={proposed.length === 0}
      status={status}
      title="Websites"
    />
  )
}

function hasSummary(facts: ContextFacts) {
  return isFactPresent(facts.name) || isFactPresent(facts.summary)
}
