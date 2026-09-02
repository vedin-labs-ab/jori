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
import {
  type AudienceFilter,
  audienceFilterOptions,
  matchesAudienceFilter,
} from "../shared/list/audience"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
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
    audience: filters.audience,
  })
  const setters = useResettingFilterSetters(filters, pagination.reset)

  return (
    <ConsolePageLayout>
      <AutomationFilters
        filter={filters.filter}
        onCreate={editor.openCreateForm}
        onCreateIntent={preloadDialog}
        query={filters.query}
        audience={filters.audience}
        setFilter={setters.setFilter}
        setQuery={setters.setQuery}
        setAudience={setters.setAudience}
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
  const [audience, setAudience] = useState<AudienceFilter>("all")
  const [query, setQuery] = useState("")

  return { filter, query, audience, setFilter, setQuery, setAudience }
}

/** Every filter change resets the pager back to the first page. */
function useResettingFilterSetters(
  filters: ReturnType<typeof useAutomationFilters>,
  reset: () => void
) {
  return {
    setFilter: useResettingSetter(filters.setFilter, reset),
    setQuery: useResettingSetter(filters.setQuery, reset),
    setAudience: useResettingSetter(filters.setAudience, reset),
  }
}

function useAutomationPagination({
  automationList,
  filter,
  query,
  audience,
}: {
  automationList: AutomationList | undefined
  filter: AutomationFilter
  query: string
  audience: AudienceFilter
}) {
  const hasFilters = hasAutomationFilters(query, filter) || audience !== "all"
  const automations =
    automationList?.status === "ready"
      ? filterAutomationsByView(automationList.automations, filter).filter(
          (automation) => matchesAudienceFilter(automation.audience, audience)
        )
      : []
  const pagination = useClientPagination({
    hasFilters,
    isReady: automationList?.status === "ready",
    itemLabel: { singular: "job", plural: "jobs" },
    items: automations,
  })

  return { hasFilters, pagination }
}

function AutomationFilters({
  filter,
  onCreate,
  onCreateIntent,
  query,
  audience,
  setFilter,
  setQuery,
  setAudience,
}: {
  filter: AutomationFilter
  onCreate: () => void
  onCreateIntent: () => void
  query: string
  audience: AudienceFilter
  setFilter: (filter: AutomationFilter) => void
  setQuery: (query: string) => void
  setAudience: (audience: AudienceFilter) => void
}) {
  function preloadDialog() {
    void onCreateIntent()
  }

  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search jobs"
          onValueChange={setQuery}
          value={query}
        />
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New job"
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
          onValueChange={setAudience}
          options={audienceFilterOptions}
          value={audience}
        />
      </ConsoleFilterGroup>
    </>
  )
}
