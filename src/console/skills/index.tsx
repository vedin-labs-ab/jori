import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { BookOpenText } from "lucide-react"
import { lazy, Suspense, useMemo, useState } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { ConsoleListPager } from "@/shared/console/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "@/shared/console/list/pagination"
import { useRetainedMount } from "@/shared/console/retain"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { type SkillEditor, useSkillEditor } from "./editor"
import { filterSkills, filterSkillsByView } from "./filter"
import { SkillContent } from "./list/content"
import { SkillFilters } from "./list/filters"
import { type Skill, type SkillFilterView } from "./types"
import { SkillViewDialog } from "./view"

// The editor form carries the integration combobox, so it loads with the
// first open rather than with the page.
const SkillDialog = lazy(() =>
  import("./dialog").then((module) => ({ default: module.SkillDialog }))
)

type SkillPagination = ReturnType<typeof useClientPagination<Skill>>

export function Skills() {
  return (
    <ConsolePage>
      {(organizationId) => <SkillsCard organizationId={organizationId} />}
    </ConsolePage>
  )
}

function SkillsCard({ organizationId }: { organizationId: string }) {
  const skillList = useQuery(api.skills.catalog.list, { organizationId })
  const editor = useSkillEditor(organizationId)
  const filters = useSkillFilters()
  const [viewSkill, setViewSkill] = useState<Skill>()
  const skills = skillList?.status === "ready" ? skillList.skills : undefined
  const visibleSkills = useMemo(
    () =>
      skills === undefined
        ? undefined
        : filterSkillsByView(
            filterSkills(skills, filters.searchTerm),
            filters.view
          ),
    [skills, filters.searchTerm, filters.view]
  )
  const isAccessReady = skillList?.status === "ready"
  const pagination = useClientPagination({
    hasFilters: filters.searchTerm.trim() !== "" || filters.view !== "all",
    isReady: skills !== undefined,
    itemLabel: { singular: "skill", plural: "skills" },
    items: visibleSkills ?? [],
    totalCount: skills?.length ?? 0,
  })
  const setSearchTermAndReset = useResettingSetter(
    filters.setSearchTerm,
    pagination.reset
  )
  const setViewAndReset = useResettingSetter(filters.setView, pagination.reset)

  return (
    <SkillFilters
      defaultView={defaultSkillView}
      isCreateDisabled={!isAccessReady}
      onCreate={editor.openCreateForm}
      onSearchChange={setSearchTermAndReset}
      onViewChange={setViewAndReset}
      searchTerm={filters.searchTerm}
      view={filters.view}
    >
      <ConsolePageLayout>
        <SkillListBody
          editor={editor}
          onViewSkillChange={setViewSkill}
          pagination={pagination}
          searchTerm={filters.searchTerm}
          skillList={skillList}
          visibleCount={visibleSkills?.length ?? 0}
          view={filters.view}
        />
        <SkillDialogs
          editor={editor}
          onViewSkillChange={setViewSkill}
          viewSkill={viewSkill}
        />
      </ConsolePageLayout>
    </SkillFilters>
  )
}

const defaultSkillView: SkillFilterView = "organization"

function useSkillFilters() {
  const [view, setView] = useState<SkillFilterView>(defaultSkillView)
  const [searchTerm, setSearchTerm] = useState("")

  return { searchTerm, setSearchTerm, setView, view }
}

function SkillListBody({
  editor,
  onViewSkillChange,
  pagination,
  searchTerm,
  skillList,
  visibleCount,
  view,
}: {
  editor: SkillEditor
  onViewSkillChange: (skill: Skill) => void
  pagination: SkillPagination
  searchTerm: string
  skillList: FunctionReturnType<typeof api.skills.catalog.list> | undefined
  visibleCount: number
  view: SkillFilterView
}) {
  if (skillList?.status === "unauthorized") {
    return (
      <ConsoleEmptyState
        title="Skill access unavailable"
        description={skillList.message}
        icon={BookOpenText}
      />
    )
  }

  return (
    <>
      <SkillContent
        filteredCount={visibleCount}
        skills={pagination.visibleRows}
        isLoading={skillList === undefined}
        onCreate={editor.openCreateForm}
        onDelete={editor.deleteSkill}
        onEdit={editor.openEditForm}
        onView={onViewSkillChange}
        pendingSkillId={editor.pendingSkillId}
        searchTerm={searchTerm}
        view={view}
      />
      <ConsoleListPager pagination={pagination} />
    </>
  )
}

function SkillDialogs({
  editor,
  onViewSkillChange,
  viewSkill,
}: {
  editor: SkillEditor
  onViewSkillChange: (skill: Skill | undefined) => void
  viewSkill: Skill | undefined
}) {
  const isFormMounted = useRetainedMount(editor.isFormOpen)

  return (
    <>
      {isFormMounted ? (
        <Suspense fallback={null}>
          <SkillDialog
            isOpen={editor.isFormOpen}
            isSaving={
              editor.pendingSkillId === (editor.formSkill?._id ?? "new")
            }
            onOpenChange={editor.setIsFormOpen}
            onSave={editor.saveSkill}
            onValuesChange={editor.setFormValues}
            skill={editor.formSkill}
            values={editor.formValues}
          />
        </Suspense>
      ) : null}
      <SkillViewDialog
        skill={viewSkill}
        onOpenChange={(open) => {
          if (!open) {
            onViewSkillChange(undefined)
          }
        }}
      />
    </>
  )
}
