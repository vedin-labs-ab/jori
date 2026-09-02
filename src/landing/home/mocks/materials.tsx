import { DemoConsole } from "../../demo/console"
import { renewalsTableId } from "../../demo/fixtures/materials/tables"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Section } from "../../section"

/** The materials pillar: the real grid over the table the hero's job keeps,
 *  under the crumb that says where it lives. */
export function Materials() {
  const console = useDemoNavigation(`/tables/${renewalsTableId}`)

  return (
    <Section
      lede="A job doesn't answer in a chat window. It writes rows to a table, a value to a store, a file to a folder. You and Jori edit the same materials under the same sharing, so anything it keeps current is something anyone can check and correct."
      title="Work lands where you can find it"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16">
        <div>
          <DemoConsole
            className="h-[22rem]"
            navigation={console}
            sidebar={false}
          />
          <p className="mt-3 text-muted-foreground text-sm">
            Kept current by a job. Anyone who can see the folder can correct a
            cell, and the correction sticks.
          </p>
        </div>
        <dl className="space-y-8">
          <Definition term="Tables">
            Typed columns, a grid people edit by hand, CSV in and out.
          </Definition>
          <Definition term="Stores">
            One JSON document, with a schema if you want one. The state a job
            carries between runs.
          </Definition>
          <Definition term="Files">
            Anything, viewed in place: a PDF, an image, a page of notes. Jori
            saves what it makes and marks it as its own.
          </Definition>
        </dl>
      </div>
    </Section>
  )
}
