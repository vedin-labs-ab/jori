import { BookOpenText, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { IntegrationLogoStack } from "../../shared/logo/integration"
import { relativeTime } from "../../shared/time"
import { getSkillIcon } from "../metadata"
import { type Skill } from "../types"
import { SkillManagementMenu } from "./menu"

export function SkillCard({
  isPending,
  now,
  onDelete,
  onEdit,
  onView,
  skill,
}: {
  isPending: boolean
  now: number
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  onView: (skill: Skill) => void
  skill: Skill
}) {
  const isGlobal = skill.scope === "global"
  const Icon = getSkillIcon(skill.category)

  return (
    <Card className="min-h-56 gap-0 py-0 ring-inset">
      <div className="grid flex-1 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 sm:p-5">
        <SkillIcon icon={Icon} skill={skill} />
        <div className="grid min-w-0 content-start gap-2">
          <div className="grid min-h-6 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h3 className="truncate font-heading text-sm font-medium">
              {skill.name}
            </h3>
            {isGlobal ? (
              <span className="h-6 whitespace-nowrap text-muted-foreground text-xs">
                Global
              </span>
            ) : (
              <SkillManagementMenu
                isPending={isPending}
                onDelete={onDelete}
                onEdit={onEdit}
                skill={skill}
              />
            )}
          </div>
          <p className="line-clamp-4 text-muted-foreground text-xs/relaxed">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex min-h-14 flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-4 py-3 sm:px-5">
        <IntegrationLogoStack
          emptyFallback={
            <span className="text-muted-foreground text-sm">-</span>
          }
          integrations={skill.associatedIntegrations}
          size="md"
        />
        <div className="ml-auto flex items-center gap-3">
          {skill.scope === "tenant" ? (
            <span className="whitespace-nowrap text-muted-foreground text-xs">
              Updated {relativeTime(skill.updatedAt, now)}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onView(skill)}
          >
            View skill
            <BookOpenText />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function SkillIcon({ icon: Icon, skill }: { icon: LucideIcon; skill: Skill }) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted text-foreground"
      title={skill.category}
    >
      <span className="sr-only">{skill.category}</span>
      <Icon className="size-5" />
    </div>
  )
}
