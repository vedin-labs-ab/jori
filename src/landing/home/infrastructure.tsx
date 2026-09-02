import { RegionFlag } from "@/shared/region/flags"
import { Definition, Section } from "../section"

/** Residency and price, folded into one quiet section: procurement facts,
 *  not the pitch. The Stripe carve-out is stated before anyone asks,
 *  because the buyer who cares about residency will. */
export function Infrastructure() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Choose where your data lives, US or EU. Payments settle through Stripe in the US; everything else stays in region."
      support
      title="Runs where you need it"
    >
      <dl className="grid max-w-3xl gap-8 md:grid-cols-2 lg:gap-16">
        <Definition
          term={
            <>
              <span className="inline-flex gap-1">
                <RegionFlag region="us" />
                <RegionFlag region="eu" />
              </span>
              US and EU residency
            </>
          }
        >
          Two isolated regional applications, one product. Region is where your
          data lives, not a checkbox on a form.
        </Definition>
        <Definition term="No seats, no markup">
          One price for the organization. Model work at the provider's list
          rates, drawn from prepaid credit with a cap you set.
        </Definition>
      </dl>
    </Section>
  )
}
