import { Jori } from "@/shared/brand"
import { DemoConsole } from "../../demo/console"
import { useDemoNavigation } from "../../demo/navigation"
import { Section } from "../../section"

/** The chores pillar: the Jobs page itself over Copperline's eight jobs.
 *  The list is the argument, so the section is the list and nothing else. */
export function Chores() {
  const console = useDemoNavigation("/jobs")

  return (
    <Section
      id="work"
      lede={
        <>
          Weekly summaries, invoice reminders, ticket triage. Describe the work
          and give <Jori tilt="left" /> the access they need. They run the job
          on a schedule or when an event triggers it, and save the results in
          your workspace.
        </>
      }
      support
      title="Hand over the work nobody wants"
    >
      <DemoConsole
        lazy
        className="h-[min(40rem,85svh)] md:h-[40rem]"
        navigation={console}
        sidebar={false}
      />
    </Section>
  )
}
