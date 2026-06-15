import { BookOpenText, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { IntegrationLogoStack } from "../integrations/logo"
import { relativeTime } from "../runs/format"
import { SkillManagementMenu } from "./menu"
import { getSkillIcon } from "./metadata"
import { type Skill } from "./types"

export function SkillCard({
  isPending,
  now,
  onDelete,
  onEdit,
  onToggleGlobalSkill,
  onView,
  skill,
}: {
  isPending: boolean
  now: number
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  onToggleGlobalSkill?: (skill: Skill, enabled: boolean) => void
  onView: (skill: Skill) => void
  skill: Skill
}) {
  const isGlobal = skill.scope === "global"
  const Icon = getSkillIcon(skill.category)

  return (
    <Card className="min-h-56 gap-0 py-0 transition-shadow duration-200 hover:shadow-sm">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <SkillIcon icon={Icon} skill={skill} />
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="truncate font-heading text-sm font-medium">
              {skill.name}
            </h3>
            <p className="mt-1 line-clamp-3 text-muted-foreground text-xs/relaxed">
              {skill.description}
            </p>
          </div>
          {isGlobal ? (
            <GlobalSkillToggle
              isPending={isPending}
              onToggle={onToggleGlobalSkill}
              skill={skill}
            />
          ) : (
            <SkillManagementMenu
              isPending={isPending}
              onDelete={onDelete}
              onEdit={onEdit}
              skill={skill}
            />
          )}
        </div>
      </div>

      <div className="mt-auto flex min-h-14 flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-4 py-3">
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

function GlobalSkillToggle({
  isPending,
  onToggle,
  skill,
}: {
  isPending: boolean
  onToggle?: (skill: Skill, enabled: boolean) => void
  skill: Skill
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-muted-foreground text-xs">
      <span>{skill.enabled ? "Enabled" : "Disabled"}</span>
      <Switch
        aria-label={`${skill.name} enabled`}
        checked={skill.enabled}
        disabled={isPending || onToggle === undefined}
        onCheckedChange={(enabled) => onToggle?.(skill, enabled)}
      />
    </div>
  )
}
