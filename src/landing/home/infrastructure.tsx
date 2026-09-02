import { RegionFlag } from "@/shared/region/flags"
import { Definition, Section } from "../section"

/** Residency and price, folded into one quiet section: procurement facts,
 *  not the pitch. The Stripe carve-out is stated before anyone asks,
 *  because the buyer who cares about residency will. */

export function Infrastructure() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede={
        <>
          Choose where your data lives. Payments settle through{" "}
          <a
            className="relative -top-[0.1em] inline-block align-middle transition-opacity hover:opacity-70"
            href="https://stripe.com"
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Stripe"
              className="inline-block h-[1.15em]"
              src="/logos/subprocessors/stripe.svg"
            />
          </a>{" "}
          in the US; everything else stays in region.
        </>
      }
      support
      title="Hosted in your region"
    >
      <dl className="grid max-w-3xl gap-8 md:grid-cols-2 lg:gap-16">
        <Definition term="Data residency">
          Two isolated regional applications, one product. Your data lives in
          the <Region region="us" /> or the <Region region="eu" />. Region is a
          place, not a checkbox on a form.
        </Definition>
        <Definition term="No seats, no markup">
          One price for the organization. Model work at the provider's list
          rates, drawn from prepaid credit with a cap you set.
        </Definition>
      </dl>
    </Section>
  )
}

/** A region named beside its flag, set in the foreground so the two
 *  choices stand out of the muted line that offers them. */
function Region({ region }: { region: "eu" | "us" }) {
  return (
    <span className="whitespace-nowrap font-medium text-foreground">
      <RegionFlag
        className="mr-1 inline-block align-[-0.125em]"
        region={region}
      />
      {region.toUpperCase()}
    </span>
  )
}
