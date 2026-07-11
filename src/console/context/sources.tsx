import { useMutation } from "convex/react"
import { FileText, Globe2, Plus, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { Paged } from "../shared/paging"
import { ContextSectionTitle } from "./section"
import { type ContextFacts, type ContextSource } from "./types"
import { sourceLabel, type WebsiteItem, websiteItems } from "./url"

const visibleSourceCount = 3

/**
 * One row for every domain that defines the organization: discovered website
 * domains as links, user-added ones as removable "Added" chips, and an
 * inline add control in the header.
 */
export function WebsitesSection({
  declared,
  domains,
  primaryWebsite,
  tenantId,
}: {
  declared: string[]
  domains: ContextFacts["domains"]
  primaryWebsite: string | undefined
  tenantId: string
}) {
  const websites = websiteItems(domains, primaryWebsite)
  const count = websites.length + declared.length

  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle
        action={<AddDomainControl tenantId={tenantId} />}
        count={count === 0 ? undefined : count}
      >
        Websites
      </ContextSectionTitle>
      {count === 0 ? null : (
        <div className="flex flex-wrap gap-1.5">
          {websites.map((website) => (
            <WebsiteChip key={website.key} website={website} />
          ))}
          {declared.map((domain) => (
            <DeclaredDomainChip
              domain={domain}
              key={domain}
              tenantId={tenantId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export function WebsitesContent({ websites }: { websites: WebsiteItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {websites.map((website) => (
        <WebsiteChip key={website.key} website={website} />
      ))}
    </div>
  )
}

function WebsiteChip({ website }: { website: WebsiteItem }) {
  return (
    <Button
      asChild
      className="h-8 justify-start gap-2 px-2.5 text-xs"
      size="sm"
      variant="secondary"
    >
      <a href={website.href} rel="noreferrer" target="_blank">
        <Globe2 className="size-3.5" />
        <span>{website.label}</span>
        {website.main ? (
          <Badge
            className="border-transparent bg-background dark:bg-background"
            variant="outline"
          >
            Main
          </Badge>
        ) : null}
      </a>
    </Button>
  )
}

/**
 * "+ Add" button that swaps into an inline input group for declaring an
 * email domain whose people count as part of the organization.
 */
function AddDomainControl({ tenantId }: { tenantId: string }) {
  const declareDomain = useMutation(api.organization.profile.declareDomain)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")

  const close = () => {
    setOpen(false)
    setValue("")
  }

  const onAdd = async () => {
    if (value.trim() === "") {
      return
    }

    try {
      await declareDomain({ tenantId, domain: value })
      close()
    } catch (error) {
      showErrorToast(error, "Could not add that domain.")
    }
  }

  if (!open) {
    return (
      <Button
        className="h-7 px-2.5 text-xs"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="size-3.5" /> Add
      </Button>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void onAdd()
      }}
    >
      <ButtonGroup>
        <InputGroup className="w-44">
          <InputGroupInput
            aria-label="Domain to add"
            autoFocus
            className="text-xs"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                close()
              }
            }}
            placeholder="acme.com"
            value={value}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Close" onClick={close} size="icon-xs">
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <Button
          className="h-7 px-2.5 text-xs"
          disabled={value.trim() === ""}
          size="sm"
          type="submit"
          variant="outline"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </ButtonGroup>
    </form>
  )
}

/** A user-added domain, styled like the website chips but removable. */
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
    <div className="flex h-8 items-center gap-2 rounded-md bg-secondary px-2.5 text-secondary-foreground text-xs">
      <Globe2 className="size-3.5 text-muted-foreground" />
      <span>{domain}</span>
      <Badge
        className="border-transparent bg-background dark:bg-background"
        variant="outline"
      >
        Added
      </Badge>
      <button
        aria-label={`Remove ${domain}`}
        className="-mr-0.5 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => void onRemove()}
        type="button"
      >
        <X className="size-3" />
      </button>
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
