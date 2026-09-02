import { DemoConsole } from "../../demo/console"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Jori, Section } from "../../section"

/** The bill: the organization's Usage page, window select and all, over
 *  Copperline's tree. The three terms name what the page is cut by. */
export function Usage() {
  const console = useDemoNavigation("/folders/usage")

  return (
    <Section
      lede={
        <>
          Spend is attributed where the job is filed, so a team's total is a
          folder's total and a job's total is one row. Open Usage on any folder
          and see spend by subfolder and by source over the window you choose,
          priced at the provider's list rates. Not a report{" "}
          <Jori tilt="slight" /> writes about their own work.
        </>
      }
      title="Every folder has a bill"
    >
      <dl className="grid gap-x-12 gap-y-8 md:grid-cols-3">
        <Definition term="By team">
          Engineering, Marketing, Finance: whatever your folders are called,
          that's what the bill is called.
        </Definition>
        <Definition term="By source">
          Each row is a job, or work someone asked for directly, with runs and
          cost per run.
        </Definition>
        <Definition term="Down to the run">
          Every run shows what it read, did, and cost, and the billing statement
          links each charge to its run.
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
