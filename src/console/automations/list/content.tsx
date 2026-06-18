import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsoleScrollableList } from "../../shared/layout"
import { type AutomationEditor } from "../editor"
import { type AutomationList } from "../types"
import { AutomationSkeletonList, EmptyAutomations } from "./empty"
import { AutomationRow } from "./row"

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
      <ConsoleScrollableList className="pb-2 lg:grid-cols-2">
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

  if (automationList.automations.length === 0) {
    return (
      <ConsoleScrollableList className="pb-2 lg:grid-cols-2">
        <li className="lg:col-span-2">
          <EmptyAutomations hasFilters={hasFilters} />
        </li>
      </ConsoleScrollableList>
    )
  }

  return (
    <ConsoleScrollableList className="pb-2 lg:grid-cols-2">
      {visibleAutomations.map((automation) => (
        <AutomationRow
          isDeleting={editor.deletingAutomationId === automation.id}
          key={automation.id}
          now={now}
          onDelete={editor.deleteAutomation}
          onEdit={editor.openEditForm}
          automation={automation}
        />
      ))}
    </ConsoleScrollableList>
  )
}
