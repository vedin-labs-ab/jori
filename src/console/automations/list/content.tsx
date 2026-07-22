import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsoleScrollableList } from "../../shared/layout"
import { type AutomationEditor } from "../editor"
import { type AutomationList } from "../types"
import { AutomationSkeletonList, EmptyAutomations } from "./empty"
import { AutomationRow } from "./row"

// Auto-fill tracks add columns as the viewport grows instead of stretching
// cards, keeping the unbounded console frame usable at any width.
const automationGrid =
  "grid-cols-[repeat(auto-fill,minmax(min(28rem,100%),1fr))] pb-2"

export function AutomationContent({
  editor,
  hasFilters,
  now,
  automationList,
  visibleAutomations,
}: {
  editor: AutomationEditor
  hasFilters: boolean
  now: number
  automationList: AutomationList | undefined
  visibleAutomations: AutomationList["automations"]
}) {
  if (automationList === undefined) {
    return (
      <ConsoleScrollableList className={automationGrid}>
        <AutomationSkeletonList />
      </ConsoleScrollableList>
    )
  }

  if (automationList.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Automation access unavailable</AlertTitle>
        <AlertDescription>{automationList.message}</AlertDescription>
      </Alert>
    )
  }

  if (visibleAutomations.length === 0) {
    return (
      <ConsoleScrollableList className={automationGrid}>
        <li className="col-span-full">
          <EmptyAutomations hasFilters={hasFilters} />
        </li>
      </ConsoleScrollableList>
    )
  }

  return (
    <ConsoleScrollableList className="pb-2 lg:grid-cols-2">
      {visibleAutomations.map((automation) => (
        <AutomationRow
          isControlling={editor.controllingAutomationId === automation.id}
          isDeleting={editor.deletingAutomationId === automation.id}
          key={automation.id}
          now={now}
          onDelete={editor.deleteAutomation}
          onEdit={editor.openEditForm}
          onPausedChange={editor.setAutomationPaused}
          automation={automation}
        />
      ))}
    </ConsoleScrollableList>
  )
}
