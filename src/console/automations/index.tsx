import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
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
  type AutomationFilter,
  type AutomationList,
  automationFilterOptions,
} from "./types"

export function Automations() {
  return (
    <ConsolePage>
      {(tenantId) => <AutomationListView tenantId={tenantId} />}
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
  const { dialog, editor, preloadDialog } = useAutomationEditorHost(tenantId)
  const now = useNow(30_000)
  const { hasFilters, pagination } = useAutomationPagination({
    automationList,
    filter: filters.filter,
    query: deferredQuery,
    scope: filters.scope,
  })
  const setFilterAndReset = useResettingSetter(
    filters.setFilter,
    pagination.reset
  )
  const setQueryAndReset = useResettingSetter(
    filters.setQuery,
    pagination.reset
  )
  const setScopeAndReset = useResettingSetter(
    filters.setScope,
    pagination.reset
  )

  return (
    <ConsolePageLayout>
      <AutomationFilters
        filter={filters.filter}
        onCreate={editor.openCreateForm}
        onCreateIntent={preloadDialog}
        query={filters.query}
        scope={filters.scope}
        setFilter={setFilterAndReset}
        setQuery={setQueryAndReset}
        setScope={setScopeAndReset}
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
      {dialog}
    </ConsolePageLayout>
  )
}

function useAutomationFilters() {
  const [filter, setFilter] = useState<AutomationFilter>("active")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [query, setQuery] = useState("")

  return { filter, query, scope, setFilter, setQuery, setScope }
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
