import { DemoConsole } from "../../demo/console"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Jori, Section } from "../../section"

/** The bill: the organization's Usage page, window select and all, over
 *  Copperline's tree. Three terms name what the page is cut by, and the
 *  fourth says what the bill is not: seats, or a markup. */
export function Usage() {
  const console = useDemoNavigation("/folders/usage")

  return (
    <Section
      lede={
        <>
          Spend lands where the job is filed, so a team's total is its folder's
          total and a job's total is one row. Open Usage on any folder to see
          spend by subfolder and by source over the window you choose. A metered
          bill, not a report <Jori tilt="slight" /> writes about their own work.
        </>
      }
      title="Every folder has a bill"
    >
      <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        <Definition term="By team">
          Engineering, Marketing, Finance: whatever your folders are called,
          that's what the bill is called.
        </Definition>
        <Definition term="By source">
          Each row is a job, or work someone asked for directly, with runs and
          cost per run.
        </Definition>
        <Definition term="Down to the run">
          Every number opens to the runs behind it, and the statement links each
          charge to its run.
        </Definition>
        <Definition term="No seats, no markup">
          One price for the organization. Model work at the provider's list
          rates, from prepaid credit with a cap you set.
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
