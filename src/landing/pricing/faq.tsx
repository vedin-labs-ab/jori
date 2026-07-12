import { Link } from "@tanstack/react-router"
import { Section } from "../section"

export function Faq() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="The short version. For access and data, the trust page goes deeper."
      title="Questions, answered straight"
    >
      <dl className="grid gap-x-16 gap-y-8 md:grid-cols-2">
        <Answer question="What's a credit?">
          A credit covers Milo's model work. A typical run, a brief, a dossier,
          a mention answered, costs about one. Long research runs can cost a
          few.
        </Answer>
        <Answer question="Do credits roll over?">
          Included credits reset monthly. Credits you add on roll over until
          they're used.
        </Answer>
        <Answer question="Is there a free trial?">
          No. Pick a plan and your first brief lands tomorrow at 08:00. Plans
          are monthly; cancel anytime.
        </Answer>
        <Answer question="Who sees what Milo reads?">
          Milo works with the accounts each person connects, as that person.
          Personal work stays personal; organization work is visible to the
          team.{" "}
          <Link
            className="font-medium text-primary hover:underline"
            to="/trust"
          >
            More on the trust page.
          </Link>
        </Answer>
        <Answer question="GDPR and DPAs?">
          Milo is built to operate in line with GDPR. For a data processing
          agreement, write to security@milo.app.
        </Answer>
      </dl>
    </Section>
  )
}

function Answer({
  children,
  question,
}: {
  children: React.ReactNode
  question: string
}) {
  return (
    <div>
      <dt className="font-medium">{question}</dt>
      <dd className="mt-1.5 max-w-md text-muted-foreground text-sm leading-relaxed">
        {children}
      </dd>
    </div>
  )
}
