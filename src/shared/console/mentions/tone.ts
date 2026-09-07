import { type MentionKind } from "./scan"

export type MentionTone = {
  icon: string
  separator: string
  surface: string
}

/** Every mention pill shares one pastel construction — soft tinted
 *  surface, saturated icon, foreground text — on a hue of its kind's own:
 *  amber for skills, teal for tools, violet for integrations, blue for
 *  resources. */
export const mentionTones = {
  integration: {
    icon: "text-[#6256C7]",
    separator: "bg-[#DDD6F5]",
    surface: "border-[#D4C8F3] bg-[#FAF8FF] text-[#1F2937]",
  },
  resource: {
    icon: "text-[#2563EB]",
    separator: "bg-[#C9D7ED]",
    surface: "border-[#BFD3F2] bg-[#F7FAFF] text-[#1F2937]",
  },
  skill: {
    icon: "text-[#B45309]",
    separator: "bg-[#EDD9B9]",
    surface: "border-[#EDD9B9] bg-[#FDFAF2] text-[#1F2937]",
  },
  tool: {
    icon: "text-[#0F766E]",
    separator: "bg-[#B9DDD6]",
    surface: "border-[#B9DDD6] bg-[#F4FBF9] text-[#1F2937]",
  },
} satisfies Record<MentionKind, MentionTone>
