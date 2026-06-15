import { useQuery } from "convex/react"
import { Plus, Search } from "lucide-react"
import { lazy, Suspense, useDeferredValue, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useToolPermissions } from "../permissions/controller"
import { type AutomationEditor, useAutomationEditor } from "./editor"
import { AutomationSkeletonList, EmptyAutomations } from "./list/empty"
import { AutomationRow } from "./list/row"
import { automationPolicyKey } from "./surface/policy"
import {
  type AutomationFilter,
  type AutomationList,
  automationFilterOptions,
} from "./types"

let automationDialogModule:
  | Promise<typeof import("./editor/dialog")>
  | undefined

function loadAutomationDialog() {
  automationDialogModule ??= import("./editor/dialog")
  return automationDialogModule
}

// The dialog pulls in the TipTap editor, which dwarfs the list view. Loading it
// lazily keeps the editor out of the route chunk.
const AutomationDialog = lazy(async () => ({
  default: (await loadAutomationDialog()).AutomationDialog,
}))

export function Automations() {
  return (
    <ConsolePage>
      {(organization) => <AutomationListView tenantId={organization.id} />}
    </ConsolePage>
  )
}

function AutomationListView({ tenantId }: { tenantId: string }) {
  const [filter, setFilter] = useState<AutomationFilter>("active")
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const automationList = useQuery(api.automations.console.list, {
    tenantId,
    query: deferredQuery,
    includeCompleted: filter === "all",
  })
  const permissions = useToolPermissions(tenantId)
  const editor = useAutomationEditor(tenantId, permissions.permissions)
  const now = useNow()
  const isDialogMounted = useAutomationDialogMount(editor.isFormOpen)

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <AutomationFilters
        filter={filter}
        onCreate={editor.openCreateForm}
        onCreateIntent={loadAutomationDialog}
        query={query}
        setFilter={setFilter}
        setQuery={setQuery}
      />
      {editor.deleteError === undefined ? null : (
        <Alert variant="destructive">
          <AlertTitle>Could not delete automation</AlertTitle>
          <AlertDescription>{editor.deleteError}</AlertDescription>
        </Alert>
      )}
      <AutomationRows
        editor={editor}
        hasFilters={deferredQuery.trim() !== ""}
        now={now}
        automationList={automationList}
      />
      {isDialogMounted ? (
        <Suspense fallback={null}>
          <AutomationDialog
            error={editor.formError}
            isOpen={editor.isFormOpen}
            isSaving={editor.isSaving}
            onOpenChange={editor.setIsFormOpen}
            onSave={editor.saveAutomation}
            onValuesChange={editor.setFormValues}
            permissions={permissions.permissions}
            policyKey={automationPolicyKey(permissions.permissions)}
            automation={editor.formAutomation}
            tenantId={tenantId}
            values={editor.formValues}
          />
        </Suspense>
      ) : null}
    </section>
  )
}

function useAutomationDialogMount(isFormOpen: boolean) {
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    if (isFormOpen) {
      setHasOpened(true)
    }
  }, [isFormOpen])

  return isFormOpen || hasOpened
}

function AutomationFilters({
  filter,
  onCreate,
  onCreateIntent,
  query,
  setFilter,
  setQuery,
}: {
  filter: AutomationFilter
  onCreate: () => void
  onCreateIntent: () => Promise<unknown>
  query: string
  setFilter: (filter: AutomationFilter) => void
  setQuery: (query: string) => void
}) {
  function preloadDialog() {
    void onCreateIntent()
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <ToggleGroup
        className="flex-wrap justify-start"
        onValueChange={(value) => {
          if (value !== "") {
            setFilter(value as AutomationFilter)
          }
        }}
        type="single"
        value={filter}
        variant="outline"
      >
        {automationFilterOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row md:flex-none">
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search automations"
            className="pr-2 pl-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search automations"
            value={query}
          />
        </div>
        <Button
          onClick={() => {
            preloadDialog()
            onCreate()
          }}
          onFocus={preloadDialog}
          onPointerEnter={preloadDialog}
          type="button"
        >
          <Plus />
          New automation
        </Button>
      </div>
    </div>
  )
}

function AutomationRows({
  editor,
  hasFilters,
  now,
  automationList,
}: {
  editor: AutomationEditor
  hasFilters: boolean
  now: number
  automationList: AutomationList | undefined
}) {
  if (automationList === undefined) {
    return <AutomationSkeletonList />
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
    return <EmptyAutomations hasFilters={hasFilters} />
  }

  return (
    <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-2 overflow-y-auto">
      {automationList.automations.map((automation) => (
        <AutomationRow
          isDeleting={editor.deletingAutomationId === automation.id}
          key={automation.id}
          now={now}
          onDelete={editor.deleteAutomation}
          onEdit={editor.openEditForm}
          automation={automation}
        />
      ))}
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)

    return () => window.clearInterval(interval)
  }, [])

  return now
}
