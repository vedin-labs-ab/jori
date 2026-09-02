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
      <dl className="grid gap-8 md:grid-cols-3 lg:gap-12">
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
      {/* The grid keeps the product's column widths, so it takes the full
          width under the definitions rather than a column beside them:
          every column of the table the hero's job keeps stays in view. */}
      <DemoConsole
        className="mt-12 h-[24rem]"
        navigation={console}
        sidebar={false}
      />
    </Section>
  )
}
