import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Paged } from "../../../shared/paging"
import { ContextSectionTitle } from "../../section"
import { sourceLabel, type WebsiteItem, websiteItems } from "../discovery/url"
import { type ContextFacts, type ContextSource } from "../types"
import { AddDomainControl } from "./domains/add"
import { DeclaredDomainChip, WebsiteChip } from "./domains/chip"

const visibleSourceCount = 3

/**
 * One row for every domain that defines the organization: discovered website
 * domains as links, user-added ones as removable "Added" chips, and an
 * inline add control in the header. Secondary domains only qualify a main
 * website, so before one exists — it is added through the profile card's
 * Add flow — the section renders nothing at all.
 */
export function WebsitesSection({
  declared,
  domains,
  primaryWebsite,
  organizationId,
}: {
  declared: string[]
  domains: ContextFacts["domains"]
  primaryWebsite: string | undefined
  organizationId: string
}) {
  if (primaryWebsite === undefined) {
    return null
  }

  const websites = websiteItems(domains, primaryWebsite)
  const count = websites.length + declared.length

  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle
        action={<AddDomainControl organizationId={organizationId} />}
        count={count}
      >
        Websites
      </ContextSectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {websites.map((website) => (
          <WebsiteChip
            badge={website.main ? "Main" : undefined}
            key={website.key}
            website={website}
          />
        ))}
        {declared.map((domain) => (
          <DeclaredDomainChip
            domain={domain}
            key={domain}
            organizationId={organizationId}
          />
        ))}
      </div>
    </section>
  )
}

export function WebsitesContent({ websites }: { websites: WebsiteItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {websites.map((website) => (
        <WebsiteChip
          badge={website.main ? "Main" : undefined}
          key={website.key}
          website={website}
        />
      ))}
    </div>
  )
}

export function SourcesSection({
  sources,
}: {
  sources: ContextSource[] | undefined
}) {
  if (sources === undefined) {
    return <Skeleton className="h-28 w-full rounded-lg" />
  }

  if (sources.length === 0) {
    return null
  }

  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle count={sources.length}>Sources</ContextSectionTitle>
      <SourcesContent sources={sources} />
    </section>
  )
}

export function SourcesContent({
  sources,
}: {
  sources: ContextSource[] | undefined
}) {
  if (sources === undefined) {
    return <Skeleton className="h-28 w-full rounded-lg" />
  }

  if (sources.length === 0) {
    return null
  }

  return (
    <Paged
      initialCount={visibleSourceCount}
      items={sources}
      step={sources.length}
    >
      {(visible) => (
        <ul className="grid gap-1">
          {visible.map((source) => (
            <SourceRow key={source.url} source={source} />
          ))}
        </ul>
      )}
    </Paged>
  )
}

function SourceRow({ source }: { source: ContextSource }) {
  return (
    <li className="min-w-0">
      <Button
        asChild
        className="max-w-full justify-start px-0 text-foreground hover:text-foreground"
        size="sm"
        variant="link"
      >
        <a href={source.url} rel="noreferrer" target="_blank">
          <FileText aria-hidden="true" className="text-muted-foreground" />
          <span className="min-w-0 truncate">{sourceLabel(source.url)}</span>
        </a>
      </Button>
    </li>
  )
}
