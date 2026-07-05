import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { useToolPermissions } from "../permissions/controller"
import {
  ConsoleFilterToggle,
  ConsolePageLayout,
  ConsoleToolbar,
  ConsoleToolbarActions,
  ConsoleToolbarSearch,
} from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import { useClientPagination } from "../shared/list/pagination"
import { useNow } from "../shared/time"
import { automationPolicyKey } from "./access/policy"
import { type AutomationEditor, useAutomationEditor } from "./editor"
import { filterAutomationsByView, hasAutomationFilters } from "./filter"
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
    statusFilter: filters.filter,
  })
  const permissions = useToolPermissions(tenantId)
  const editor = useAutomationEditor(tenantId, permissions.permissions)
  const now = useNow(30_000)
  const isDialogMounted = useAutomationDialogMount(editor.isFormOpen)
  const { hasFilters, pagination } = useAutomationPagination({
    automationList,
    filter: filters.filter,
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
  filter,
  query,
}: {
  automationList: AutomationList | undefined
  filter: AutomationFilter
  query: string
}) {
  const hasFilters = hasAutomationFilters(query, filter)
  const automations =
    automationList?.status === "ready"
      ? filterAutomationsByView(automationList.automations, filter)
      : []
  const pagination = useClientPagination({
    hasFilters,
    isReady: automationList?.status === "ready",
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
      <ConsoleFilterToggle
        onValueChange={setFilter}
        options={automationFilterOptions}
        value={filter}
      />
      <ConsoleToolbarActions>
        <ConsoleToolbarSearch
          label="Search automations"
          onValueChange={setQuery}
          value={query}
        />
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
