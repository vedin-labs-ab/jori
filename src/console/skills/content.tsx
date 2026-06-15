import { LoadingMessage } from "../loading"
import { SkillSection } from "./section"
import { type Skill, type SkillFilterView } from "./types"

type GroupedSkills = Record<Skill["scope"], Skill[]>

export function SkillContent({
  groupedSkills,
  isLoading,
  onDelete,
  onEdit,
  onToggleGlobalSkill,
  onView,
  pendingGlobalSkillId,
  pendingSkillId,
  searchTerm,
  view,
}: {
  groupedSkills: GroupedSkills
  isLoading: boolean
  onDelete: (skill: Skill) => void
  onEdit: (skill: Skill) => void
  onToggleGlobalSkill: (skill: Skill, enabled: boolean) => void
  onView: (skill: Skill) => void
  pendingGlobalSkillId: string | undefined
  pendingSkillId: string | undefined
  searchTerm: string
  view: SkillFilterView
}) {
  if (isLoading) {
    return <LoadingMessage label="Loading skills" />
  }

  const isFiltering = searchTerm.trim().length > 0

  return (
    <div className="grid gap-9">
      {view !== "global" ? (
        <SkillSection
          description="Editable skills created and managed by your organization."
          emptyLabel={organizationEmptyLabel(isFiltering)}
          onDelete={onDelete}
          onEdit={onEdit}
          onView={onView}
          pendingSkillId={pendingSkillId}
          skills={groupedSkills.tenant}
          title="Organization skills"
        />
      ) : null}
      {view !== "tenant" ? (
        <SkillSection
          description="System-defined skills enabled by default for your organization."
          emptyLabel={globalEmptyLabel(isFiltering)}
          onToggleGlobalSkill={onToggleGlobalSkill}
          onView={onView}
          pendingSkillId={pendingGlobalSkillId}
          skills={groupedSkills.global}
          title="Global skills"
        />
      ) : null}
    </div>
  )
}

function organizationEmptyLabel(isFiltering: boolean) {
  return isFiltering
    ? "No matching organization skills."
    : "No organization skills yet. Add one to teach Milo how your team works."
}

function globalEmptyLabel(isFiltering: boolean) {
  return isFiltering ? "No matching global skills." : "No global skills yet."
}
