import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { MoveResourceDialog } from "../folders/move"
import { ConsolePage } from "../page"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsolePageLayout,
  ConsoleSearch,
} from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import {
  matchesScopeFilter,
  type ScopeFilter,
  scopeFilterOptions,
} from "../shared/list/scope"
import { useNow } from "../shared/time"
import { useAutomationEditorHost } from "./editor/host"
import { filterAutomationsByView, hasAutomationFilters } from "./filter"
import { AutomationContent } from "./list/content"
import {
  type Automation,
  type AutomationFilter,
  type AutomationList,
  automationFilterOptions,
} from "./types"

export function Automations() {
  return (
    <ConsolePage>
      {(organizationId) => (
        <AutomationListView organizationId={organizationId} />
      )}
    </ConsolePage>
  )
}

function AutomationListView({ organizationId }: { organizationId: string }) {
  const filters = useAutomationFilters()
  const deferredQuery = useDeferredValue(filters.query)
  const automationList = useQuery(api.automations.console.list, {
    organizationId,
    query: deferredQuery,
    statusFilter: filters.filter,
  })
  const { dialog, editor, preloadDialog } =
    useAutomationEditorHost(organizationId)
  const [movingAutomation, setMovingAutomation] = useState<Automation>()
  const now = useNow(30_000)
  const { hasFilters, pagination } = useAutomationPagination({
    automationList,
    filter: filters.filter,
    query: deferredQuery,
    scope: filters.scope,
  })
  const setters = useResettingFilterSetters(filters, pagination.reset)

  return (
    <ConsolePageLayout>
      <AutomationFilters
        filter={filters.filter}
        onCreate={editor.openCreateForm}
        onCreateIntent={preloadDialog}
        query={filters.query}
        scope={filters.scope}
        setFilter={setters.setFilter}
        setQuery={setters.setQuery}
        setScope={setters.setScope}
      />
      <AutomationContent
        editor={editor}
        hasFilters={hasFilters}
        now={now}
        automationList={automationList}
        onCreate={() => {
          void preloadDialog()
          editor.openCreateForm()
        }}
        onMoveToFolder={setMovingAutomation}
        visibleAutomations={pagination.visibleRows}
      />
      {automationList?.status !== "unauthorized" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
      {dialog}
      <MoveResourceDialog
        onClose={() => setMovingAutomation(undefined)}
        organizationId={organizationId}
        resource={movingResource(movingAutomation)}
      />
    </ConsolePageLayout>
  )
}

function movingResource(automation: Automation | undefined) {
  return automation === undefined
    ? undefined
    : {
        resourceType: "automation" as const,
        resourceId: automation.id,
        name: automation.name,
        folderId: automation.folderId,
      }
}

function useAutomationFilters() {
  const [filter, setFilter] = useState<AutomationFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [query, setQuery] = useState("")

  return { filter, query, scope, setFilter, setQuery, setScope }
}

/** Every filter change resets the pager back to the first page. */
function useResettingFilterSetters(
  filters: ReturnType<typeof useAutomationFilters>,
  reset: () => void
) {
  return {
    setFilter: useResettingSetter(filters.setFilter, reset),
    setQuery: useResettingSetter(filters.setQuery, reset),
    setScope: useResettingSetter(filters.setScope, reset),
  }
}

function useAutomationPagination({
  automationList,
  filter,
  query,
  scope,
}: {
  automationList: AutomationList | undefined
  filter: AutomationFilter
  query: string
  scope: ScopeFilter
}) {
  const hasFilters = hasAutomationFilters(query, filter) || scope !== "all"
  const automations =
    automationList?.status === "ready"
      ? filterAutomationsByView(automationList.automations, filter).filter(
          (automation) => matchesScopeFilter(automation.scope, scope)
        )
      : []
  const pagination = useClientPagination({
    hasFilters,
    isReady: automationList?.status === "ready",
    itemLabel: { singular: "automation", plural: "automations" },
    items: automations,
  })

  return { hasFilters, pagination }
}

function AutomationFilters({
  filter,
  onCreate,
  onCreateIntent,
  query,
  scope,
  setFilter,
  setQuery,
  setScope,
}: {
  filter: AutomationFilter
  onCreate: () => void
  onCreateIntent: () => void
  query: string
  scope: ScopeFilter
  setFilter: (filter: AutomationFilter) => void
  setQuery: (query: string) => void
  setScope: (scope: ScopeFilter) => void
}) {
  function preloadDialog() {
    void onCreateIntent()
  }

  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search automations"
          onValueChange={setQuery}
          value={query}
        />
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New automation"
          onClick={() => {
            preloadDialog()
            onCreate()
          }}
          onFocus={preloadDialog}
          onPointerEnter={preloadDialog}
          type="button"
        />
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={setFilter}
          options={automationFilterOptions}
          value={filter}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={setScope}
          options={scopeFilterOptions}
          value={scope}
        />
      </ConsoleFilterGroup>
    </>
  )
}
