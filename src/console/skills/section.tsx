import { Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { DeleteSkill } from "./delete"
import { type Skill } from "./types"

export function SkillSection({
  description,
  emptyLabel,
  onDelete,
  onEdit,
  pendingSkillId,
  skills,
  title,
}: {
  description: string
  emptyLabel: string
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  pendingSkillId: string | undefined
  skills: Skill[]
  title: string
}) {
  return (
    <section className="grid content-start gap-3">
      <div className="grid gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">{title}</h2>
          <Badge variant="outline">{skills.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3">
        {skills.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : null}

        {skills.map((skill) => (
          <SkillRow
            key={skill._id}
            isPending={pendingSkillId === skill._id}
            onDelete={onDelete}
            onEdit={onEdit}
            skill={skill}
          />
        ))}
      </div>
    </section>
  )
}

function SkillRow({
  isPending,
  onDelete,
  onEdit,
  skill,
}: {
  isPending: boolean
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  skill: Skill
}) {
  const isEditable = skill.scope === "tenant"

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{skill.name}</div>
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {skill.description}
          </div>
        </div>
        <Badge variant={isEditable ? "secondary" : "outline"}>
          {isEditable ? "Organization" : "Built-in"}
        </Badge>
      </div>

      {isEditable ? (
        <SkillActions
          isPending={isPending}
          onDelete={onDelete}
          onEdit={onEdit}
          skill={skill}
        />
      ) : null}
    </div>
  )
}

function SkillActions({
  isPending,
  onDelete,
  onEdit,
  skill,
}: {
  isPending: boolean
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  skill: Skill
}) {
  return (
    <>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit?.(skill)}
          disabled={isPending}
        >
          <Pencil />
          Edit
        </Button>
        <DeleteSkill
          isPending={isPending}
          onDelete={() => onDelete?.(skill)}
          skill={skill}
        />
      </div>
    </>
  )
}
