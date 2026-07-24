import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { Link } from "@tanstack/react-router"
import { Cable } from "lucide-react"
import { lazy, Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { type PlaybookActions } from "../enable"
import { type PlaybookListRow, planPlaybookEnable } from "../state"
import { type PlaybookSetupDialogProps } from "./dialog"

// The setup form reaches the integration combobox and every customization
// control, so it loads with the first open rather than with the page.
const SetupDialog = lazy(() =>
  import("./dialog").then((module) => ({ default: module.PlaybookSetupDialog }))
)

/** The setup dialog, loaded on demand. Callers already gate on open state. */
export function PlaybookSetupDialog(props: PlaybookSetupDialogProps) {
  return (
    <Suspense fallback={null}>
      <SetupDialog {...props} />
    </Suspense>
  )
}

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
  organizationId,
}: {
  actions: PlaybookActions
  definition: PlaybookDefinition
  row: PlaybookListRow
  organizationId: string
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
          organizationId={organizationId}
        />
      ) : null}
    </>
  )
}
