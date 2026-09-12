import { termsVersion } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { Markdown } from "@/shared/console/markdown"
import dpa from "./legal/dpa.md?raw"
import privacy from "./legal/privacy.md?raw"
import terms from "./legal/terms.md?raw"
import { MarketingShell } from "./shell"

export function PrivacyPage() {
  return <LegalDocument title="Privacy policy" text={privacy} />
}

export function TermsPage() {
  return <LegalDocument title="Terms of service" text={terms} />
}

export function DpaPage() {
  return <LegalDocument title="Data processing agreement" text={dpa} />
}

function LegalDocument({ title, text }: { title: string; text: string }) {
  const sections = text
    .trim()
    .split(/^## /m)
    .filter(Boolean)
    .map((section) => {
      const line = section.indexOf("\n")
      const heading = section.slice(0, line)
      return {
        heading,
        id: heading.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        body: section.slice(line + 1).trim(),
      }
    })

  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-3xl px-6 py-20 md:py-28">
        <header className="mb-10 space-y-4">
          <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Last updated <time dateTime={termsVersion}>12 September 2026</time>
          </p>
          <nav
            aria-label="Legal documents"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm underline underline-offset-4"
          >
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/dpa">Data processing</Link>
          </nav>
        </header>
        <nav aria-label="On this page" className="mb-12 border-y py-6">
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {sections.map(({ id, heading }) => (
              <li key={id}>
                <a
                  className="text-muted-foreground hover:text-foreground hover:underline"
                  href={`#${id}`}
                >
                  {heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="space-y-10">
          {sections.map(({ id, heading, body }) => (
            <section aria-labelledby={id} key={id}>
              <h2
                className="mb-4 scroll-mt-24 font-semibold text-xl tracking-tight"
                id={id}
              >
                {heading}
              </h2>
              <Markdown
                className="text-sm [&_p]:my-4 [&_li]:my-2 [&_table]:text-sm [&_td]:py-3 [&_th]:py-3"
                text={body}
              />
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  )
}
