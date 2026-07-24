import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ConsoleFilterGroup,
  ConsoleFilterToggle,
  ConsoleHeaderActions,
  ConsolePageLayout,
  ConsoleScrollableList,
  ConsoleSearch,
} from "../../shared/layout"
import { ConsoleListPager } from "../../shared/list/pager"
import { type useClientPagination } from "../../shared/list/pagination"
import { type ScopeFilter, scopeFilterOptions } from "../../shared/list/scope"
import { type AppFilter, appFilterOptions } from "../filter"
import { type AppListResult, type AppSummary } from "../types"
import { AppSkeletonList, EmptyApps } from "./empty"
import { AppRow } from "./row"

type AppPagination = ReturnType<typeof useClientPagination<AppSummary>>

type AppToolbarProps = {
  filter: AppFilter
  onFilterChange: (value: AppFilter) => void
  onQueryChange: (value: string) => void
  onScopeChange: (value: ScopeFilter) => void
  query: string
  scope: ScopeFilter
}

export function AppLoadingView(props: AppToolbarProps) {
  return (
    <ConsolePageLayout>
      <AppToolbar {...props} />
      <AppLoadingState />
    </ConsolePageLayout>
  )
}

export function AppReadyView({
  appList,
  apps,
  deletingAppId,
  filter,
  hasFilters,
  now,
  onDelete,
  onFilterChange,
  onQueryChange,
  onRestore,
  onScopeChange,
  pagination,
  query,
  restoringAppId,
  scope,
}: AppToolbarProps & {
  appList: AppListResult
  apps: AppSummary[]
  deletingAppId: string | undefined
  hasFilters: boolean
  now: number
  onDelete: (app: AppSummary) => void
  onRestore: (app: AppSummary) => void
  pagination: AppPagination
  restoringAppId: string | undefined
}) {
  return (
    <ConsolePageLayout>
      <AppToolbar
        filter={filter}
        onFilterChange={onFilterChange}
        onQueryChange={onQueryChange}
        onScopeChange={onScopeChange}
        query={query}
        scope={scope}
      />
      <AppListBody
        appList={appList}
        apps={apps}
        deletingAppId={deletingAppId}
        hasFilters={hasFilters}
        now={now}
        onDelete={onDelete}
        onRestore={onRestore}
        restoringAppId={restoringAppId}
        showScope={scope === "all"}
      />
      {appList.status === "ready" ? (
        <ConsoleListPager pagination={pagination} />
      ) : null}
    </ConsolePageLayout>
  )
}

function AppToolbar({
  filter,
  onFilterChange,
  onQueryChange,
  onScopeChange,
  query,
  scope,
}: AppToolbarProps) {
  return (
    <>
      <ConsoleHeaderActions>
        <ConsoleSearch
          label="Search apps"
          onValueChange={onQueryChange}
          value={query}
        />
      </ConsoleHeaderActions>
      <ConsoleFilterGroup>
        <ConsoleFilterToggle
          label="Status"
          onValueChange={onFilterChange}
          options={appFilterOptions}
          value={filter}
        />
        <ConsoleFilterToggle
          label="Sharing"
          onValueChange={onScopeChange}
          options={scopeFilterOptions}
          value={scope}
        />
      </ConsoleFilterGroup>
    </>
  )
}

function AppListBody({
  appList,
  apps,
  deletingAppId,
  hasFilters,
  now,
  onDelete,
  onRestore,
  restoringAppId,
  showScope,
}: {
  appList: AppListResult
  apps: AppSummary[]
  deletingAppId: string | undefined
  hasFilters: boolean
  now: number
  onDelete: (app: AppSummary) => void
  onRestore: (app: AppSummary) => void
  restoringAppId: string | undefined
  showScope: boolean
}) {
  if (appList.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load apps</AlertTitle>
        <AlertDescription>{appList.message}</AlertDescription>
      </Alert>
    )
  }

  if (apps.length === 0) {
    return (
      <ConsoleScrollableList className="pb-2">
        <li>
          <EmptyApps hasFilters={hasFilters} />
        </li>
      </ConsoleScrollableList>
    )
  }

  return (
    <ConsoleScrollableList className="pb-2">
      {apps.map((app) => (
        <AppRow
          app={app}
          isDeleting={deletingAppId === app.appId}
          isRestoring={restoringAppId === app.appId}
          key={app.appId}
          now={now}
          onDelete={onDelete}
          onRestore={onRestore}
          showScope={showScope}
        />
      ))}
    </ConsoleScrollableList>
  )
}

function AppLoadingState() {
  return (
    <ConsoleScrollableList className="pb-2">
      <AppSkeletonList />
    </ConsoleScrollableList>
  )
}
