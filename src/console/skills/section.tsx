import { Badge } from "@/components/ui/badge"
import { SkillCard } from "./card"
import { type Skill } from "./types"

export function SkillSection({
  description,
  emptyLabel,
  onDelete,
  onEdit,
  onToggleGlobalSkill,
  onView,
  pendingSkillId,
  skills,
  title,
}: {
  description: string
  emptyLabel: string
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  onToggleGlobalSkill?: (skill: Skill, enabled: boolean) => void
  onView: (skill: Skill) => void
  pendingSkillId: string | undefined
  skills: Skill[]
  title: string
}) {
  const now = Date.now()

  return (
    <section className="grid content-start gap-4">
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-medium">{title}</h2>
          <Badge variant="secondary">{skills.length}</Badge>
        </div>
        <p className="max-w-2xl text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skills.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            {emptyLabel}
          </div>
        ) : null}

        {skills.map((skill) => (
          <SkillCard
            key={skill._id}
            isPending={pendingSkillId === skill._id}
            now={now}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleGlobalSkill={onToggleGlobalSkill}
            onView={onView}
            skill={skill}
          />
        ))}
      </div>
    </section>
  )
}
