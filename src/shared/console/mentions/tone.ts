import { type MentionKind } from "./scan"

export type MentionTone = {
  icon: string
  separator: string
  surface: string
}

/** Every mention pill shares one construction — a soft tint of its hue
 *  over whatever the page is, a saturated icon, foreground text — on a
 *  hue of its kind's own: amber for skills, teal for tools, violet for
 *  integrations, blue for resources. The tints are alphas of the hue, so
 *  the pill holds in the dark theme as it does in the light. */
export const mentionTones = {
  integration: {
    icon: "text-violet-600 dark:text-violet-400",
    separator: "bg-violet-500/25",
    surface:
      "border-violet-500/25 bg-violet-500/10 text-foreground dark:bg-violet-400/15",
  },
  resource: {
    icon: "text-blue-600 dark:text-blue-400",
    separator: "bg-blue-500/25",
    surface:
      "border-blue-500/25 bg-blue-500/10 text-foreground dark:bg-blue-400/15",
  },
  skill: {
    icon: "text-amber-700 dark:text-amber-400",
    separator: "bg-amber-500/30",
    surface:
      "border-amber-500/30 bg-amber-500/10 text-foreground dark:bg-amber-400/15",
  },
  tool: {
    icon: "text-teal-700 dark:text-teal-400",
    separator: "bg-teal-500/30",
    surface:
      "border-teal-500/30 bg-teal-500/10 text-foreground dark:bg-teal-400/15",
  },
} satisfies Record<MentionKind, MentionTone>
