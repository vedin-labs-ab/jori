import { Section } from "../section"
import {
  GitHubMention,
  LinearMention,
  ReviewMention,
  SlackMention,
} from "./mentions"

export function Threads() {
  return (
    <Section
      lede="Mention Milo in Slack, GitHub, or Linear and it does the one-off job right there in the thread."
      support
      title="The rest, you just ask for"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <SlackMention />
        <GitHubMention />
        <LinearMention />
        <ReviewMention />
      </div>
    </Section>
  )
}
