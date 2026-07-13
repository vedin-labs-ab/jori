import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ConsoleListPager } from "../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../shared/list/pagination"
import { SkillDialog } from "./dialog"
import { type SkillEditor, useSkillEditor } from "./editor"
import { filterSkills, filterSkillsByView } from "./helpers"
import { SkillContent } from "./list/content"
import { SkillsToolbar } from "./list/toolbar"
import { type Skill, type SkillFilterView } from "./types"
import { SkillViewDialog } from "./view"

export function Skills() {
  return (
    <ConsolePage>
      {(tenantId) => <SkillsCard tenantId={tenantId} />}
    </ConsolePage>
  )
}

function SkillsCard({ tenantId }: { tenantId: string }) {
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
  const setSearchTermAndReset = useResettingSetter(
    filters.setSearchTerm,
    pagination.reset
  )
  const setViewAndReset = useResettingSetter(filters.setView, pagination.reset)

  return (
    <ConsolePageLayout>
      <SkillsToolbar
        isCreateDisabled={!isAccessReady}
        onCreate={editor.openCreateForm}
        onSearchChange={setSearchTermAndReset}
        onViewChange={setViewAndReset}
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
  const [view, setView] = useState<SkillFilterView>("tenant")
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
  pagination: ReturnType<typeof useSkillPagination>["pagination"]
  searchTerm: string
  skillList: ReturnType<typeof useQuery<typeof api.skills.catalog.list>>
  visibleCount: number
  view: SkillFilterView
}) {
  if (skillList?.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Skill access unavailable</AlertTitle>
        <AlertDescription>{skillList.message}</AlertDescription>
      </Alert>
    )
  }

  return (
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
