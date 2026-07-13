import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { Link } from "@tanstack/react-router"
import { Cable } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { type PlaybookActions } from "../enable"
import { type PlaybookListRow, planPlaybookEnable } from "../state"
import { PlaybookSetupDialog } from "./dialog"

/** Link to the integrations page for a playbook that lacks a connection. */
export function ConnectButton({ label }: { label: string }) {
  return (
    <Button asChild className="w-full" variant="outline">
      <Link to="/integrations">
        <Cable /> {label}
      </Link>
    </Button>
  )
}

/** Connect prompt or an Enable button that opens the setup dialog. */
export function SetupControls({
  actions,
  definition,
  row,
  tenantId,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow
  tenantId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const plan = planPlaybookEnable(row.slots)

  if (plan.kind === "connect") {
    return <ConnectButton label={plan.label} />
  }

  return (
    <>
      <Button className="w-full" onClick={() => setIsOpen(true)} type="button">
        Enable
      </Button>
      {isOpen ? (
        <PlaybookSetupDialog
          actions={actions}
          definition={definition}
          onOpenChange={setIsOpen}
          open={isOpen}
          plan={plan}
          row={row}
          tenantId={tenantId}
        />
      ) : null}
    </>
  )
}
