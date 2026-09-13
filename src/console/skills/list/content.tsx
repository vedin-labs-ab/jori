import { BookOpenText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConsoleScrollableGrid } from "@/shared/console/layout"
import {
  ConsoleEmptyState,
  ConsoleListEmpty,
} from "@/shared/console/list/empty"
import { ConsoleListLoading } from "@/shared/console/list/loading"
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

  if (filteredCount === 0) {
    return (
      <ConsoleListEmpty>
        <ConsoleEmptyState
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
          icon={BookOpenText}
          title={emptyTitle(view, isFiltering)}
        />
      </ConsoleListEmpty>
    )
  }

  return (
    <ConsoleScrollableGrid className="md:grid-cols-2 xl:grid-cols-3">
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

    return `No matching ${view} skills`
  }

  if (view === "all") {
    return "No skills yet"
  }

  return `No ${view} skills`
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
