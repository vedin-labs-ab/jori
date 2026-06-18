import { BookOpenText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ConsoleScrollableGrid } from "../shared/layout"
import { ConsoleEmptyState } from "../shared/list/empty"
import { SkillCard } from "./card"
import { type Skill, type SkillFilterView } from "./types"

const skeletonCards = ["first", "second", "third", "fourth", "fifth", "sixth"]

export function SkillContent({
  filteredCount,
  isLoading,
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
  onDelete: (skill: Skill) => void
  onEdit: (skill: Skill) => void
  onView: (skill: Skill) => void
  pendingSkillId: string | undefined
  searchTerm: string
  skills: Skill[]
  view: SkillFilterView
}) {
  if (isLoading) {
    return (
      <ConsoleScrollableGrid className="md:grid-cols-2 xl:grid-cols-3">
        <SkillSkeletonList />
      </ConsoleScrollableGrid>
    )
  }

  const isFiltering = searchTerm.trim().length > 0
  const now = Date.now()

  return (
    <ConsoleScrollableGrid className="md:grid-cols-2 xl:grid-cols-3">
      {filteredCount === 0 ? (
        <SkillEmptyState
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

  return "Add one to teach Milo how your team works."
}

function viewLabel(view: SkillFilterView) {
  if (view === "tenant") {
    return "organization"
  }

  if (view === "global") {
    return "global"
  }

  return ""
}

function SkillEmptyState({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <ConsoleEmptyState
      className="md:col-span-2 xl:col-span-3"
      description={description}
      icon={BookOpenText}
      title={title}
    />
  )
}

function SkillSkeletonList() {
  return (
    <>
      {skeletonCards.map((card) => (
        <Skeleton className="h-56 w-full rounded-lg" key={card} />
      ))}
    </>
  )
}
