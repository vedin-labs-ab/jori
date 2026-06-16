import { useQuery } from "convex/react"
import { Plus, Search } from "lucide-react"
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api } from "../../../convex/_generated/api"
import {
  ConsolePageLayout,
  ConsoleToolbar,
  ConsoleToolbarActions,
} from "../layout"
import { ConsoleListPager } from "../list/pager"
import { useClientPagination } from "../list/pagination"
import { ConsolePage } from "../page"
import { useToolPermissions } from "../permissions/controller"
import { automationPolicyKey } from "./access/policy"
import { type AutomationEditor, useAutomationEditor } from "./editor"
import { AutomationContent } from "./list/content"
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
  const filters = useAutomationFilters()
  const deferredQuery = useDeferredValue(filters.query)
  const automationList = useQuery(api.automations.console.list, {
    tenantId,
    query: deferredQuery,
    includeCompleted: filters.filter === "all",
  })
  const permissions = useToolPermissions(tenantId)
  const editor = useAutomationEditor(tenantId, permissions.permissions)
  const now = useNow()
  const isDialogMounted = useAutomationDialogMount(editor.isFormOpen)
  const { hasFilters, pagination } = useAutomationPagination({
    automationList,
    query: deferredQuery,
  })
  const toolbar = useResettingAutomationFilters(filters, pagination.reset)

  return (
    <ConsolePageLayout>
      <AutomationFilters
        filter={filters.filter}
        onCreate={editor.openCreateForm}
        onCreateIntent={loadAutomationDialog}
        query={filters.query}
        setFilter={toolbar.setFilter}
        setQuery={toolbar.setQuery}
      />
      {editor.deleteError === undefined ? null : (
        <Alert variant="destructive">
          <AlertTitle>Could not delete automation</AlertTitle>
          <AlertDescription>{editor.deleteError}</AlertDescription>
        </Alert>
      )}
      <AutomationContent
        editor={editor}
        hasFilters={hasFilters}
        now={now}
        automationList={automationList}
        visibleAutomations={pagination.visibleRows}
      />
      {automationList?.status !== "unauthorized" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
      <AutomationEditorDialog
        editor={editor}
        isMounted={isDialogMounted}
        permissions={permissions.permissions}
        tenantId={tenantId}
      />
    </ConsolePageLayout>
  )
}

function useAutomationFilters() {
  const [filter, setFilter] = useState<AutomationFilter>("active")
  const [query, setQuery] = useState("")

  return { filter, query, setFilter, setQuery }
}

function useResettingAutomationFilters(
  filters: ReturnType<typeof useAutomationFilters>,
  reset: () => void
) {
  const setFilter = useCallback(
    (value: AutomationFilter) => {
      filters.setFilter(value)
      reset()
    },
    [filters.setFilter, reset]
  )
  const setQuery = useCallback(
    (value: string) => {
      filters.setQuery(value)
      reset()
    },
    [filters.setQuery, reset]
  )

  return { setFilter, setQuery }
}

function useAutomationPagination({
  automationList,
  query,
}: {
  automationList: AutomationList | undefined
  query: string
}) {
  const hasFilters = query.trim() !== ""
  const automations =
    automationList?.status === "ready" ? automationList.automations : []
  const pagination = useClientPagination({
    hasFilters,
    itemLabel: { singular: "automation", plural: "automations" },
    items: automations,
  })

  return { hasFilters, pagination }
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

function AutomationEditorDialog({
  editor,
  isMounted,
  permissions,
  tenantId,
}: {
  editor: AutomationEditor
  isMounted: boolean
  permissions: ReturnType<typeof useToolPermissions>["permissions"]
  tenantId: string
}) {
  if (!isMounted) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <AutomationDialog
        error={editor.formError}
        isOpen={editor.isFormOpen}
        isSaving={editor.isSaving}
        onOpenChange={editor.setIsFormOpen}
        onSave={editor.saveAutomation}
        onValuesChange={editor.setFormValues}
        permissions={permissions}
        policyKey={automationPolicyKey(permissions)}
        automation={editor.formAutomation}
        tenantId={tenantId}
        values={editor.formValues}
      />
    </Suspense>
  )
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
    <ConsoleToolbar>
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
      <ConsoleToolbarActions>
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
      </ConsoleToolbarActions>
    </ConsoleToolbar>
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
