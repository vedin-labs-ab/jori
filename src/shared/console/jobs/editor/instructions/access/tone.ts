import { Ban, CircleDashed, FilePenLine, FileText, PenLine } from "lucide-react"
import { type MentionTone, mentionTones } from "@/shared/console/mentions/tone"
import { type getJobSurfaceAccess } from "../../../access"

export function getJobSurfaceAccessIcon(
  access: ReturnType<typeof getJobSurfaceAccess>,
  blocked: boolean
) {
  if (blocked) {
    return Ban
  }

  if (access === "read") {
    return FileText
  }

  if (access === "write") {
    return PenLine
  }

  return access === "both" ? FilePenLine : CircleDashed
}

export function getJobSurfaceToneClassNames(
  access: ReturnType<typeof getJobSurfaceAccess>,
  blocked: boolean
) {
  return blocked
    ? jobSurfaceToneClassNames.blocked
    : jobSurfaceToneClassNames[access]
}

/** Skill and tool pills wear the shared mention tones, on hues adjacent
 *  to the integration pills' pastels. */
export const jobReferenceToneClassNames = {
  skill: mentionTones.skill,
  tool: mentionTones.tool,
}

/** An integration pill wears its access as a hue, built the way the
 *  mention pills are, so it holds on either ground: violet for full
 *  access, blue for read, green for write, the page's own grays until
 *  one is chosen. */
const jobSurfaceToneClassNames = {
  "": {
    icon: "text-muted-foreground",
    separator: "bg-border",
    surface: "border-border bg-muted text-muted-foreground",
  },
  both: mentionTones.integration,
  read: mentionTones.resource,
  write: {
    icon: "text-emerald-700 dark:text-emerald-400",
    separator: "bg-emerald-500/30",
    surface:
      "border-emerald-500/30 bg-emerald-500/10 text-foreground dark:bg-emerald-400/15",
  },
  blocked: {
    icon: "text-destructive",
    separator: "bg-destructive/20",
    surface: "border-destructive/50 bg-destructive/5 text-destructive",
  },
} satisfies Record<
  ReturnType<typeof getJobSurfaceAccess> | "blocked",
  MentionTone
>
