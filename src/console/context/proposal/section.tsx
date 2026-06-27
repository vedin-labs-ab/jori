import { ChevronDown } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { OrganizationName, SummaryText } from "../facts"
import { ContextSectionTitle } from "../section"
import { type ContextFacts, isFactPresent } from "../types"
import { type ProposalSectionStatus } from "./changes"

export function ReviewSection({
  count,
  current,
  currentEmpty,
  proposed,
  proposedEmpty,
  status,
  title,
}: {
  count?: number
  current: ReactNode
  currentEmpty: boolean
  proposed: ReactNode
  proposedEmpty: boolean
  status: ProposalSectionStatus
  title: string
}) {
  return (
    <section className="grid gap-2.5">
      <ContextSectionTitle
        action={<StatusBadge status={status} />}
        count={count}
      >
        {title}
      </ContextSectionTitle>
      {proposedEmpty ? <EmptyValue /> : proposed}
      {status === "changed" ? (
        <CurrentDisclosure current={current} empty={currentEmpty} />
      ) : null}
    </section>
  )
}

export function SummaryContent({ facts }: { facts: ContextFacts }) {
  return (
    <div className="grid max-w-3xl gap-2">
      {isFactPresent(facts.name) ? (
        <OrganizationName>{facts.name}</OrganizationName>
      ) : null}
      {isFactPresent(facts.summary) ? (
        <SummaryText>{facts.summary}</SummaryText>
      ) : null}
    </div>
  )
}

export function EmptyValue() {
  return <p className="text-muted-foreground text-xs/relaxed">None</p>
}

function CurrentDisclosure({
  current,
  empty,
}: {
  current: ReactNode
  empty: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <Button
          className="w-fit px-0 text-muted-foreground hover:text-foreground"
          size="sm"
          type="button"
          variant="link"
        >
          <ChevronDown
            className={cn("transition-transform", open && "rotate-180")}
          />
          {open ? "Hide current" : "Show current"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 grid gap-2 rounded-md border bg-muted/20 p-3">
          <span className="font-medium text-muted-foreground text-xs">
            Currently approved
          </span>
          {empty ? <EmptyValue /> : current}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function StatusBadge({ status }: { status: ProposalSectionStatus }) {
  const changed = status === "changed"

  return (
    <Badge variant={changed ? "secondary" : "outline"}>
      {changed ? "Changed" : "Unchanged"}
    </Badge>
  )
}
