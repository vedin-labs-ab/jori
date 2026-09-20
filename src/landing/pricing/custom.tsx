import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Jori } from "@/shared/brand"

/** The third folder is a conversation, not a plan, so it is not a tab. It
 *  is a dark green card in either scheme: the dark tokens, with the brand
 *  green mixed into their ground. Mixed in oklab, not oklch: a neutral
 *  carries hue 0, and mixing hues would land the green in brown. */
export function Custom() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-14 md:py-18">
      <div className="dark rounded-2xl bg-[color-mix(in_oklab,var(--background),var(--primary)_55%)] px-6 py-10 text-foreground sm:px-10 md:px-12 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <h2 className="font-medium text-3xl text-balance tracking-tight sm:text-4xl">
            Need help with setup?
            <br />
            Talk to us.
          </h2>
          <div className="max-w-md">
            <p className="text-foreground/80 leading-relaxed">
              If you want to run <Jori tilt="right" /> on your own
              infrastructure or need extra support, tell us what you need.
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
