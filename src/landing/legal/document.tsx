import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MarketingShell } from "../shell"

export type LegalSection = {
  heading: string
  paragraphs: readonly string[]
}

/** Shared frame for legal documents: bounded prose, a placeholder notice
 *  until counsel-reviewed text replaces the drafts. */
export function LegalDocument({
  sections,
  title,
  updated,
}: {
  sections: readonly LegalSection[]
  title: string
  updated: string
}) {
  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-2xl px-6 pt-14 pb-24 md:pt-24">
        <h1 className="font-medium text-4xl tracking-tight">{title}</h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Last updated {updated}
        </p>
        <Alert className="mt-8">
          <AlertTitle>Draft ahead of launch</AlertTitle>
          <AlertDescription>
            This document is a working draft. A counsel-reviewed version
            replaces it before Milo launches.
          </AlertDescription>
        </Alert>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-medium text-xl tracking-tight">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  className="mt-3 text-muted-foreground text-sm leading-relaxed"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  )
}
