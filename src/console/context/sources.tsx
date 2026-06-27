import { ChevronDown, FileText, Globe2 } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { type ContextFacts, type OrganizationSources } from "./types"

type OrganizationSource = OrganizationSources[number]

type WebsiteItem = {
  href: string
  key: string
  label: string
  main: boolean
}

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
      <SectionTitle>Websites</SectionTitle>
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
    </section>
  )
}

export function SourcesSection({
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
    <section className="grid gap-2.5">
      <SectionTitle>Sources</SectionTitle>
      <ul className="grid gap-2">
        {visibleSources.map((source) => (
          <SourceRow key={source.url} source={source} />
        ))}
      </ul>
      {hiddenCount > 0 || expanded ? (
        <Button
          className="h-7 w-fit px-0 text-muted-foreground text-xs"
          onClick={() => setExpanded((value) => !value)}
          size="sm"
          type="button"
          variant="link"
        >
          {expanded ? "Show less" : `+${hiddenCount} more`}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </Button>
      ) : null}
    </section>
  )
}

function SourceRow({ source }: { source: OrganizationSource }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 text-xs">
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <a
        className="min-w-0 truncate text-foreground underline-offset-4 hover:underline"
        href={source.url}
        rel="noreferrer"
        target="_blank"
      >
        {sourceLabel(source.url)}
      </a>
    </li>
  )
}

function websiteItems(
  domains: ContextFacts["domains"],
  primaryWebsite: string | undefined
): WebsiteItem[] {
  const primary = websiteValue(primaryWebsite)
  const seen = new Set<string>()

  return [primaryWebsite, ...domains].flatMap((value) => {
    const website = websiteValue(value)

    if (website === null || seen.has(website.key)) {
      return []
    }

    seen.add(website.key)

    return [{ ...website, main: primary?.key === website.key }]
  })
}

function websiteValue(value: string | undefined) {
  const trimmed = value?.trim()

  if (trimmed === undefined || trimmed === "") {
    return null
  }

  const url = parseUrl(trimmed)

  if (url === null) {
    return { href: trimmed, key: trimmed.toLowerCase(), label: trimmed }
  }

  const hostname = url.hostname.replace(/^www[.]/, "")
  const key = `${hostname}${url.port === "" ? "" : `:${url.port}`}`

  return {
    href: url.origin,
    key: key.toLowerCase(),
    label: key,
  }
}

function sourceLabel(value: string) {
  const url = parseUrl(value)

  if (url === null) {
    return value
  }

  const hostname = url.hostname.replace(/^www[.]/, "")
  const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "")

  return `${hostname}${path}${url.search}`
}

function parseUrl(value: string) {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    return new URL(withScheme)
  } catch {
    return null
  }
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="font-medium text-muted-foreground text-xs">{children}</h3>
  )
}
