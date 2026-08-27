import { Definition, Section } from "../section"

/** Residency and model choice, folded into one quiet section: procurement
 *  facts, not the pitch. The Stripe carve-out is stated before anyone asks,
 *  because the buyer who cares about residency will. */
export function Infrastructure() {
  return (
    <Section
      lede="Choose where your data lives, US or EU, and which model providers Jori may use. Payments settle through Stripe in the US; everything else stays in region."
      support
      title="Runs where you need it"
    >
      <dl className="grid max-w-3xl gap-8 md:grid-cols-2 lg:gap-16">
        <Definition term="US and EU residency">
          Two isolated regional applications, one product. Region is where your
          data lives, not a checkbox on a form.
        </Definition>
        <Definition term="Your providers">
          The model vendors your company has approved, billed at their list
          rates. No markup.
        </Definition>
      </dl>
    </Section>
  )
}
