import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Scale, ShieldCheck } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { MarketingShell } from "./shell"

export function PrivacyPage() {
  return (
    <LegalPlaceholder
      description="We're writing this with counsel, and it'll be published before Jori opens. What Jori can access, and when it acts, is already written down."
      icon={<ShieldCheck />}
      title="Privacy policy"
    />
  )
}

export function TermsPage() {
  return (
    <LegalPlaceholder
      description="We're writing these with counsel, and they'll be published before Jori opens. What Jori can access, and when it acts, is already written down."
      icon={<Scale />}
      title="Terms of service"
    />
  )
}

/**
 * A legal document that does not exist yet.
 *
 * Placeholder headings under a draft banner look like a document while saying
 * nothing, which is worse than an empty page: a reader has to work to find
 * that out. This is the empty state exactly as the design system ships it, so
 * a page with nothing on it says so the same way every other empty surface in
 * Jori does, and offers the page that does have answers today.
 */
function LegalPlaceholder({
  description,
  icon,
  title,
}: {
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            {/* The empty state's title slot is a div, and on a page whose
                whole content is the empty state that leaves nothing for a
                reader jumping by heading to land on. */}
            <EmptyTitle>
              <h1>{title}</h1>
            </EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link to="/trust">
                Read the trust page
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    </MarketingShell>
  )
}
