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
import { ContextSectionTitle } from "../../../section"
import { type ContextFacts, isFactPresent } from "../../types"
import { OrganizationName, SummaryText } from "../facts"
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
        action={status === "changed" ? <ChangedBadge /> : undefined}
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

function EmptyValue() {
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
          {open ? "Hide current" : "Show current"}
          <ChevronDown
            className={cn("transition-transform", open && "rotate-180")}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 rounded-md border bg-muted/20 p-3">
          {empty ? <EmptyValue /> : current}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ChangedBadge() {
  return <Badge variant="secondary">Changed</Badge>
}
