import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatComposer } from "@/shared/console/chat/composer"
import { type MentionSources } from "@/shared/console/mentions/sources"

/** What the composer can mention in its tests: a table, a job, a chat,
 *  two integrations, two skills, and a tool. */
export const mentionSources: MentionSources = {
  integrations: ["slack", "github"],
  resources: [
    { kind: "table", id: "collections_renewals", name: "Customer renewals" },
    { kind: "job", id: "jobs_digest", name: "Renewals digest" },
    { kind: "chat", id: "conversations_1", name: "Last week's sync" },
  ],
  skills: ["triage", "release-notes"],
  tools: [{ surface: "jori", tool: "search_files" }],
}

/** The composer mounted the way a page mounts it, with its field found
 *  once the editor is up. */
export async function renderComposer(
  props: Partial<Parameters<typeof ChatComposer>[0]> = {}
) {
  const onSend = vi.fn()

  render(
    <TooltipProvider>
      <ChatComposer
        mentions={mentionSources}
        onSend={onSend}
        onStop={vi.fn()}
        {...props}
      />
    </TooltipProvider>
  )

  const field = await screen.findByRole("textbox", { name: "Message" })

  return { field, onSend }
}
