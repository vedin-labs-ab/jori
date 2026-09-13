import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Jori } from "../section"

/** The third folder is a conversation, not a plan, so it is not a tab. It
 *  is set in the opposite scheme with the brand green mixed in: on the light
 *  page a deep green, on the dark page a pale one, both from the tokens.
 *  Mixed in oklab, not oklch: a neutral carries hue 0, and mixing hues
 *  would land the green in brown. */
export function Custom() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-6 md:py-8">
      <div className="inverted rounded-2xl bg-[color-mix(in_oklab,var(--background),var(--primary)_55%)] px-6 py-10 text-foreground sm:px-10 md:px-12 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <h2 className="font-medium text-3xl text-balance tracking-tight sm:text-4xl">
            Run it your way.
            <br />
            With a hand from us.
          </h2>
          <div className="max-w-md">
            <p className="text-foreground/80 leading-relaxed">
              Bringing <Jori tilt="right" /> into your own infrastructure,
              ongoing support, or something specific to your organization: tell
              us what you have in mind.
            </p>
            {/* Set in the card's foreground rather than a variant's fill:
                the brand green is the ground here, so the one button on it
                is the ground's opposite. */}
            <Button
              asChild
              className="mt-6 border-transparent bg-foreground text-background hover:bg-foreground/90 [--tactile-edge:color-mix(in_oklch,var(--foreground),#000_25%)]"
              size="xl"
            >
              <a href="mailto:hello@usejori.com">
                Let's talk
                <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
