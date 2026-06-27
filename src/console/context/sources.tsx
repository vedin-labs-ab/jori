import { ChevronDown, FileText, Globe2 } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ContextSectionTitle } from "./section"
import { type ContextFacts, type OrganizationSources } from "./types"
import { sourceLabel, type WebsiteItem, websiteItems } from "./url"

type OrganizationSource = OrganizationSources[number]

const visibleSourceCount = 3

export function WebsitesSection({
  domains,
  primaryWebsite,
}: {
  domains: ContextFacts["domains"]
  primaryWebsite: string | undefined
}) {
  const websites = websiteItems(domains, primaryWebsite)

  if (websites.length === 0) {
    return null
  }

  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle count={websites.length}>
        Websites
      </ContextSectionTitle>
      <WebsitesContent websites={websites} />
    </section>
  )
}

export function WebsitesContent({ websites }: { websites: WebsiteItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {websites.map((website) => (
        <Button
          asChild
          className="h-8 justify-start gap-2 px-2.5 text-xs"
          key={website.key}
          size="sm"
          variant="outline"
        >
          <a href={website.href} rel="noreferrer" target="_blank">
            <Globe2 className="size-3.5 text-muted-foreground" />
            <span>{website.label}</span>
            {website.main ? <Badge variant="secondary">Main</Badge> : null}
          </a>
        </Button>
      ))}
    </div>
  )
}

export function SourcesSection({
  sources,
}: {
  sources: OrganizationSources | undefined
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
  sources: OrganizationSources | undefined
}) {
  const [expanded, setExpanded] = useState(false)

  if (sources === undefined) {
    return <Skeleton className="h-28 w-full rounded-lg" />
  }

  if (sources.length === 0) {
    return null
  }

  const visibleSources = expanded
    ? sources
    : sources.slice(0, visibleSourceCount)
  const hiddenCount = sources.length - visibleSources.length

  return (
    <>
      <ul className="grid gap-1">
        {visibleSources.map((source) => (
          <SourceRow key={source.url} source={source} />
        ))}
      </ul>
      {hiddenCount > 0 || expanded ? (
        <Button
          className="w-fit justify-self-start px-0 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((value) => !value)}
          size="sm"
          type="button"
          variant="link"
        >
          {expanded ? "Show less" : `+${hiddenCount} more`}
          <ChevronDown
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </Button>
      ) : null}
    </>
  )
}

function SourceRow({ source }: { source: OrganizationSource }) {
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
