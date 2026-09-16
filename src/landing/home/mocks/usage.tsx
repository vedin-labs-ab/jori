import { DemoConsole } from "../../demo/console"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Section } from "../../section"

/** The Usage page over Copperline's folders, with spending by team,
 *  source, and run. */
export function Usage() {
  const console = useDemoNavigation("/folders/usage")

  return (
    <Section
      lede={
        <>
          Open Usage on a folder to see the AI spending for the work inside.
          Choose a time period, compare jobs and subfolders, or open a run to
          see its cost.
        </>
      }
      title="See AI spending by folder"
    >
      <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <Definition term="By team">
          Give each team a folder to see its AI spending in one place.
        </Definition>
        <Definition term="By source">
          See which jobs and conversations account for the spending.
        </Definition>
        <Definition term="Down to the run">
          Follow each charge to the run that incurred it.
        </Definition>
        <Definition term="No seats, no markup">
          One monthly plan for the organization. Additional AI usage is prepaid
          at the model provider's published rates.
        </Definition>
      </dl>
      <DemoConsole
        className="mt-12 h-[44rem]"
        navigation={console}
        sidebar={false}
      />
    </Section>
  )
}
