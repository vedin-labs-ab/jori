import { useQuery } from "convex/react"
import { useCallback, useMemo, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import { useClientPagination } from "../shared/list/pagination"
import { SkillStatusAlerts } from "./alerts"
import { SkillContent } from "./content"
import { SkillDialog } from "./dialog"
import { type SkillEditor, useSkillEditor } from "./editor"
import { filterSkills, filterSkillsByView } from "./helpers"
import { SkillsToolbar } from "./toolbar"
import { type Skill, type SkillFilterView } from "./types"
import { SkillViewDialog } from "./view"

export function Skills() {
  return (
    <ConsolePage>
      {(organization) => <SkillsCard tenantId={organization.id} />}
    </ConsolePage>
  )
}

export function SkillsCard({ tenantId }: { tenantId: string }) {
  const skillList = useQuery(api.skills.catalog.list, { tenantId })
  const editor = useSkillEditor(tenantId)
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
  const { pagination } = useSkillPagination({
    skills,
    visibleSkills,
    view: filters.view,
    searchTerm: filters.searchTerm,
  })
  const toolbar = useResettingSkillFilters(filters, pagination.reset)

  return (
    <ConsolePageLayout>
      <SkillsToolbar
        isCreateDisabled={!isAccessReady}
        onCreate={editor.openCreateForm}
        onSearchChange={toolbar.setSearchTerm}
        onViewChange={toolbar.setView}
        searchTerm={filters.searchTerm}
        view={filters.view}
      />

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
  )
}

function useSkillFilters() {
  const [view, setView] = useState<SkillFilterView>("all")
  const [searchTerm, setSearchTerm] = useState("")

  return { searchTerm, setSearchTerm, setView, view }
}

function useResettingSkillFilters(
  filters: ReturnType<typeof useSkillFilters>,
  reset: () => void
) {
  const setView = useCallback(
    (value: SkillFilterView) => {
      filters.setView(value)
      reset()
    },
    [filters.setView, reset]
  )
  const setSearchTerm = useCallback(
    (value: string) => {
      filters.setSearchTerm(value)
      reset()
    },
    [filters.setSearchTerm, reset]
  )

  return { setSearchTerm, setView }
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
  pagination: ReturnType<typeof useSkillPagination>["pagination"]
  searchTerm: string
  skillList: ReturnType<typeof useQuery<typeof api.skills.catalog.list>>
  visibleCount: number
  view: SkillFilterView
}) {
  return (
    <>
      <SkillStatusAlerts deleteError={editor.deleteError} result={skillList} />
      {skillList?.status !== "unauthorized" ? (
        <>
          <SkillContent
            filteredCount={visibleCount}
            skills={pagination.visibleRows}
            isLoading={skillList === undefined}
            onDelete={editor.deleteSkill}
            onEdit={editor.openEditForm}
            onView={onViewSkillChange}
            pendingSkillId={editor.pendingSkillId}
            searchTerm={searchTerm}
            view={view}
          />
          <ConsoleListPager pagination={pagination} />
        </>
      ) : null}
    </>
  )
}

function useSkillPagination({
  skills,
  visibleSkills,
  view,
  searchTerm,
}: {
  skills: Skill[] | undefined
  visibleSkills: Skill[] | undefined
  view: SkillFilterView
  searchTerm: string
}) {
  const hasFilters = searchTerm.trim() !== "" || view !== "all"
  const pagination = useClientPagination({
    hasFilters,
    isReady: skills !== undefined,
    itemLabel: { singular: "skill", plural: "skills" },
    items: visibleSkills ?? [],
    totalCount: skills?.length ?? 0,
  })

  return { pagination }
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
  return (
    <>
      <SkillDialog
        error={editor.formError}
        isOpen={editor.isFormOpen}
        isSaving={editor.pendingSkillId === (editor.formSkill?._id ?? "new")}
        onOpenChange={editor.setIsFormOpen}
        onSave={editor.saveSkill}
        onValuesChange={editor.setFormValues}
        skill={editor.formSkill}
        values={editor.formValues}
      />
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
