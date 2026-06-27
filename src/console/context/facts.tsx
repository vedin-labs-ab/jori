import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { ContextSectionTitle } from "./section"
import { type ContextFacts, isFactPresent } from "./types"

export function FactsBody({
  facts,
  showName = true,
}: {
  facts: ContextFacts
  showName?: boolean
}) {
  return (
    <div className="grid gap-5">
      <Identity facts={facts} showName={showName} />
      <AliasSection aliases={facts.aliases} />
    </div>
  )
}

function Identity({
  facts,
  showName,
}: {
  facts: ContextFacts
  showName: boolean
}) {
  const hasName = showName && isFactPresent(facts.name)
  const hasSummary = isFactPresent(facts.summary)

  if (!hasName && !hasSummary) {
    return null
  }

  return (
    <div className="grid max-w-3xl gap-2">
      {hasName ? <OrganizationName>{facts.name}</OrganizationName> : null}
      {hasSummary ? <SummaryText>{facts.summary}</SummaryText> : null}
    </div>
  )
}

export function SummaryText({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[72ch] text-muted-foreground text-sm/relaxed">
      {children}
    </p>
  )
}

export function OrganizationName({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-heading text-lg font-medium text-foreground">
      {children}
    </h2>
  )
}

function AliasSection({ aliases }: { aliases: string[] }) {
  if (aliases.length === 0) {
    return null
  }

  return (
    <section className="grid gap-2">
      <ContextSectionTitle>Also known as</ContextSectionTitle>
      <AliasesContent aliases={aliases} />
    </section>
  )
}

export function AliasesContent({ aliases }: { aliases: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {aliases.map((alias) => (
        <Badge key={alias} variant="secondary">
          {alias}
        </Badge>
      ))}
    </div>
  )
}
