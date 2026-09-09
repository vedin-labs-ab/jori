import { DemoConsole } from "../../demo/console"
import { useDemoNavigation } from "../../demo/navigation"
import { Jori, Section } from "../../section"

/** The chores pillar: the Jobs page itself over Copperline's eight jobs.
 *  The list is the argument, so the section is the list and nothing else. */
export function Chores() {
  const console = useDemoNavigation("/jobs")

  return (
    <Section
      id="work"
      lede={
        <>
          Every company runs on chores: the weekly summary, the invoice chase,
          the ticket triage, the changelog. Write each one down once. <Jori />{" "}
          runs it on a schedule or when something happens, and files what they
          made where the team can find it.
        </>
      }
      support
      title="Hand over the work nobody wants"
    >
      <DemoConsole className="h-[40rem]" navigation={console} sidebar={false} />
    </Section>
  )
}
