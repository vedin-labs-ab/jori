import { BookOpenText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConsoleScrollableGrid } from "../../shared/layout"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListLoading } from "../../shared/list/loading"
import { type Skill, type SkillFilterView } from "../types"
import { SkillCard } from "./card"

// Auto-fill tracks add columns as the viewport grows instead of stretching
// cards, keeping the unbounded console frame usable at any width.
export function SkillContent({
  filteredCount,
  isLoading,
  onCreate,
  onDelete,
  onEdit,
  onView,
  pendingSkillId,
  searchTerm,
  skills,
  view,
}: {
  filteredCount: number
  isLoading: boolean
  onCreate: () => void
  onDelete: (skill: Skill) => void
  onEdit: (skill: Skill) => void
  onView: (skill: Skill) => void
  pendingSkillId: string | undefined
  searchTerm: string
  skills: Skill[]
  view: SkillFilterView
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  const isFiltering = searchTerm.trim().length > 0
  const now = Date.now()

  return (
    <ConsoleScrollableGrid className="md:grid-cols-2 xl:grid-cols-3">
      {filteredCount === 0 ? (
        <SkillEmptyState
          // Global skills are curated, not created, so only views that can
          // hold an organization skill offer the create action.
          action={
            isFiltering || view === "global" ? undefined : (
              <Button onClick={onCreate} type="button">
                <Plus />
                New skill
              </Button>
            )
          }
          description={emptyDescription(view, isFiltering)}
          title={emptyTitle(view, isFiltering)}
        />
      ) : null}

      {skills.map((skill) => (
        <SkillCard
          key={skill._id}
          isPending={pendingSkillId === skill._id}
          now={now}
          onDelete={onDelete}
          onEdit={onEdit}
          onView={onView}
          skill={skill}
        />
      ))}
    </ConsoleScrollableGrid>
  )
}

function emptyTitle(view: SkillFilterView, isFiltering: boolean) {
  if (isFiltering) {
    if (view === "all") {
      return "No matching skills"
    }

    return `No matching ${viewLabel(view)} skills`
  }

  if (view === "all") {
    return "No skills yet"
  }

  return `No ${viewLabel(view)} skills`
}

function emptyDescription(view: SkillFilterView, isFiltering: boolean) {
  if (isFiltering) {
    return "Try a different search term."
  }

  if (view === "global") {
    return "Global skills will appear here when they are available."
  }

  return "Add one to teach Jori how your team works."
}

function viewLabel(view: SkillFilterView) {
  if (view === "organization") {
    return "organization"
  }

  if (view === "global") {
    return "global"
  }

  return ""
}

function SkillEmptyState({
  action,
  description,
  title,
}: {
  action: React.ReactNode
  description: string
  title: string
}) {
  return (
    <ConsoleEmptyState
      action={action}
      className="col-span-full"
      description={description}
      icon={BookOpenText}
      title={title}
    />
  )
}
