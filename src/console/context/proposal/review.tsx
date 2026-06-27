import { Separator } from "@/components/ui/separator"
import { AliasesContent, ProductsContent } from "../facts"
import { SourcesContent, WebsitesContent } from "../sources"
import {
  type ContextFacts,
  isFactPresent,
  type OrganizationSources,
} from "../types"
import { websiteItems } from "../url"
import {
  approvedFacts,
  type ProposalSectionStatus,
  proposalStatuses,
} from "./changes"
import { ReviewSection, SummaryContent } from "./section"

type ProposalReviewBodyProps = {
  current: ContextFacts | null
  primaryWebsite: string | undefined
  proposed: ContextFacts
  sources: OrganizationSources | undefined
}

export function ProposalReviewBody({
  current,
  primaryWebsite,
  proposed,
  sources,
}: ProposalReviewBodyProps) {
  const approved = approvedFacts(current)
  const statuses = proposalStatuses(current, proposed, primaryWebsite)
  const currentWebsites = websiteItems(approved.domains, primaryWebsite)
  const proposedWebsites = websiteItems(proposed.domains, primaryWebsite)
  const hasSources = sources === undefined || sources.length > 0

  return (
    <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
      <OptionalSummary
        current={approved}
        proposed={proposed}
        status={statuses.summary}
      />
      <OptionalProducts
        current={approved}
        proposed={proposed}
        status={statuses.products}
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
          <ReviewSection
            count={sources?.length}
            current={null}
            currentEmpty
            proposed={<SourcesContent sources={sources} />}
            proposedEmpty={sources !== undefined && sources.length === 0}
            status="unchanged"
            title="Sources"
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

function OptionalProducts({
  current,
  proposed,
  status,
}: {
  current: ContextFacts
  proposed: ContextFacts
  status: ProposalSectionStatus
}) {
  if (current.products.length === 0 && proposed.products.length === 0) {
    return null
  }

  return (
    <ReviewSection
      count={proposed.products.length}
      current={<ProductsContent products={current.products} />}
      currentEmpty={current.products.length === 0}
      proposed={<ProductsContent products={proposed.products} />}
      proposedEmpty={proposed.products.length === 0}
      status={status}
      title="Products"
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
