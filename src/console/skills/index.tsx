import { useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { SkillStatusAlerts } from "./alerts"
import { SkillContent } from "./content"
import { SkillDialog } from "./dialog"
import { type SkillEditor, useSkillEditor } from "./editor"
import { filterSkills, filterSkillsByView } from "./helpers"
import { useGlobalSkillSettings } from "./settings"
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
  const globalSettings = useGlobalSkillSettings(tenantId)
  const [view, setView] = useState<SkillFilterView>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [viewSkill, setViewSkill] = useState<Skill>()
  const skills = skillList?.status === "ready" ? skillList.skills : undefined
  const visibleSkills = useMemo(
    () =>
      skills === undefined
        ? undefined
        : filterSkillsByView(filterSkills(skills, searchTerm), view),
    [skills, searchTerm, view]
  )
  const isAccessReady = skillList?.status === "ready"

  return (
    <div className="grid gap-7">
      <SkillsToolbar
        isCreateDisabled={!isAccessReady}
        onCreate={editor.openCreateForm}
        onSearchChange={setSearchTerm}
        onViewChange={setView}
        searchTerm={searchTerm}
        view={view}
      />

      <div className="grid gap-4">
        <SkillStatusAlerts
          deleteError={editor.deleteError}
          globalError={globalSettings.error?.message}
          result={skillList}
        />
        {skillList?.status !== "unauthorized" ? (
          <SkillContent
            skills={visibleSkills ?? []}
            isLoading={skillList === undefined}
            onDelete={editor.deleteSkill}
            onEdit={editor.openEditForm}
            onToggleGlobalSkill={globalSettings.updateGlobalSkillEnabled}
            onView={setViewSkill}
            pendingSkillId={editor.pendingSkillId}
            pendingGlobalSkillId={globalSettings.pendingSkillId}
            searchTerm={searchTerm}
            view={view}
          />
        ) : null}
      </div>

      <SkillDialogs
        editor={editor}
        onViewSkillChange={setViewSkill}
        viewSkill={viewSkill}
      />
    </div>
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
