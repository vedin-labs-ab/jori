import { Section } from "../section"
import { GitHubMention, LinearMention } from "./mentions"

export function Threads() {
  return (
    <Section
      lede="Not everything is worth an app. Mention Milo in Slack, GitHub, or Linear and it does the one-off job right there: a check, a summary, a draft, a fix. It reacts in seconds so you know it's on it, then answers when it has something worth saying."
      title="The rest, you just ask for"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <GitHubMention />
        <LinearMention />
      </div>
    </Section>
  )
}
