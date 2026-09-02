import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { DemoConsole } from "../../demo/console"
import { chaseRunId } from "../../demo/fixtures/runs"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Jori, Section } from "../../section"

/** The record: the Activity page over Copperline's runs, with the chase
 *  job's run open, a live run to stop, and an approval to decide. */
export function Record() {
  const console = useDemoNavigation("/runs")

  return (
    <Section
      lede={
        <>
          Most AI works in private. <Jori tilt="right" /> works in the open:
          Activity is the first thing in the console. Every run, whether it came
          from a job or a mention, shows what triggered it, what they read, what
          they did, what they asked, and what it cost. Stop any of them from
          anywhere you can see it running.
        </>
      }
      title="Everything on the record"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
        <DemoConsole
          className="h-[46rem]"
          navigation={console}
          openRunId={chaseRunId}
          sidebar={false}
        />
        <div>
          <dl className="space-y-8">
            <Definition term="Receipts, with the bill">
              Each run lists the model turns, the tokens, the tools, the
              seconds, and the dollars, at the rate the ledger charged.
            </Definition>
            <Definition term="Ask first means ask you">
              Set a tool to ask first and Jori requests before acting, with a
              code you can approve from the thread. Unattended runs can't touch
              an ask-first tool at all.
            </Definition>
            <Definition term="Stop means stop">
              Any run can be stopped at any moment, and the record says who
              stopped it.
            </Definition>
          </dl>
          <Link
            className="mt-7 inline-flex items-center gap-1.5 py-1 font-medium text-primary text-sm hover:underline"
            to="/trust"
          >
            How Jori handles access and data
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </Section>
  )
}
