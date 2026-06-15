import { BookOpenText } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ConsoleContentGrid } from "../layout"
import { LoadingMessage } from "../loading"
import { SkillCard } from "./card"
import { type Skill, type SkillFilterView } from "./types"

export function SkillContent({
  isLoading,
  onDelete,
  onEdit,
  onToggleGlobalSkill,
  onView,
  pendingGlobalSkillId,
  pendingSkillId,
  searchTerm,
  skills,
  view,
}: {
  isLoading: boolean
  onDelete: (skill: Skill) => void
  onEdit: (skill: Skill) => void
  onToggleGlobalSkill: (skill: Skill, enabled: boolean) => void
  onView: (skill: Skill) => void
  pendingGlobalSkillId: string | undefined
  pendingSkillId: string | undefined
  searchTerm: string
  skills: Skill[]
  view: SkillFilterView
}) {
  if (isLoading) {
    return <LoadingMessage label="Loading skills" />
  }

  const isFiltering = searchTerm.trim().length > 0
  const now = Date.now()

  return (
    <ConsoleContentGrid className="md:grid-cols-2 xl:grid-cols-3">
      {skills.length === 0 ? (
        <SkillEmptyState
          description={emptyDescription(view, isFiltering)}
          title={emptyTitle(view, isFiltering)}
        />
      ) : null}

      {skills.map((skill) => (
        <SkillCard
          key={skill._id}
          isPending={
            skill.scope === "global"
              ? pendingGlobalSkillId === skill._id
              : pendingSkillId === skill._id
          }
          now={now}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleGlobalSkill={onToggleGlobalSkill}
          onView={onView}
          skill={skill}
        />
      ))}
    </ConsoleContentGrid>
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
    <Empty className="min-h-40 rounded-md md:col-span-2 xl:col-span-3">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenText />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
