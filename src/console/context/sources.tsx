import { useMutation } from "convex/react"
import { FileText, Globe2, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { Paged } from "../shared/paging"
import { ContextSectionTitle } from "./section"
import { type ContextFacts, type ContextSource } from "./types"
import { sourceLabel, type WebsiteItem, websiteItems } from "./url"

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
            <Globe2 className="size-3.5" />
            <span>{website.label}</span>
            {website.main ? <Badge variant="secondary">Main</Badge> : null}
          </a>
        </Button>
      ))}
    </div>
  )
}

export function DomainsSection({
  tenantId,
  declared,
}: {
  tenantId: string
  declared: string[]
}) {
  const declareDomain = useMutation(api.organization.profile.declareDomain)
  const [value, setValue] = useState("")

  const onAdd = async () => {
    if (value.trim() === "") {
      return
    }

    try {
      await declareDomain({ tenantId, domain: value })
      setValue("")
    } catch (error) {
      showErrorToast(error, "Could not add that domain.")
    }
  }

  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle
        count={declared.length === 0 ? undefined : declared.length}
      >
        Internal domains
      </ContextSectionTitle>
      <p className="text-muted-foreground text-xs/relaxed">
        Milo counts people at your website domains as part of your organization.
        Add any other email domains that should count too.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {declared.map((domain) => (
          <DeclaredDomainChip
            domain={domain}
            key={domain}
            tenantId={tenantId}
          />
        ))}
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            void onAdd()
          }}
        >
          <Input
            aria-label="Add an internal domain"
            className="h-8 w-40 text-xs"
            onChange={(event) => setValue(event.target.value)}
            placeholder="acme.com"
            value={value}
          />
          <Button
            className="h-8 px-2.5 text-xs"
            disabled={value.trim() === ""}
            size="sm"
            type="submit"
            variant="outline"
          >
            Add
          </Button>
        </form>
      </div>
    </section>
  )
}

function DeclaredDomainChip({
  domain,
  tenantId,
}: {
  domain: string
  tenantId: string
}) {
  const retractDomain = useMutation(api.organization.profile.retractDomain)

  const onRemove = async () => {
    try {
      await retractDomain({ tenantId, domain })
    } catch (error) {
      showErrorToast(error, "Could not remove that domain.")
    }
  }

  return (
    <Badge className="gap-1 py-1 pr-1 font-normal" variant="secondary">
      {domain}
      <button
        aria-label={`Remove ${domain}`}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => void onRemove()}
        type="button"
      >
        <X className="size-3" />
      </button>
    </Badge>
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
