import { RegionFlag } from "@/shared/region/flags"
import { Definition, Section } from "../section"

/** Residency and price, folded into one quiet section: procurement facts,
 *  not the pitch. The Stripe carve-out is stated before anyone asks,
 *  because the buyer who cares about residency will. */
const flagClassName = "mr-1.5 inline-block align-[-0.125em]"

export function Infrastructure() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede={
        <>
          Choose where your data lives, US or EU. Payments settle through{" "}
          <a
            className="inline-block align-[-0.2em]"
            href="https://stripe.com"
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Stripe"
              className="inline-block h-[1.2em]"
              src="/logos/subprocessors/stripe.svg"
            />
          </a>{" "}
          in the US; everything else stays in region.
        </>
      }
      support
      title="Runs where you need it"
    >
      <dl className="grid max-w-3xl gap-8 md:grid-cols-2 lg:gap-16">
        <Definition
          term={
            <span>
              <RegionFlag className={flagClassName} region="us" />
              US and <RegionFlag className={flagClassName} region="eu" />
              EU residency
            </span>
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
