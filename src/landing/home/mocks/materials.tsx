import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DemoConsole } from "../../demo/console"
import { notesFileId } from "../../demo/fixtures/materials/files"
import { watchStoreId } from "../../demo/fixtures/materials/stores"
import { renewalsTableId } from "../../demo/fixtures/materials/tables"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Jori, Section } from "../../section"

/** One of each material the hero's job touches, at the page the console
 *  gives it, so the switch above the frame is a shortcut into the same
 *  console the crumb inside it walks. */
const pages = [
  { label: "Customer renewals", path: `/tables/${renewalsTableId}` },
  { label: "Renewals watch state", path: `/stores/${watchStoreId}` },
  { label: "Release notes 2.14.md", path: `/files/${notesFileId}` },
]

/** The materials pillar: the console's own page for a table, a store, and
 *  a file, one at a time, under the crumb that says where each lives. */
export function Materials() {
  const console = useDemoNavigation(pages[0].path)

  return (
    <Section
      lede={
        <>
          A job doesn't answer in a chat window. It writes rows to a table, a
          value to a store, a file to a folder. You and <Jori tilt="steep" />{" "}
          edit the same materials with the same access, so anything they keep
          current is something anyone can check and correct.
        </>
      }
      title="Work lands where you can find it"
    >
      <dl className="grid gap-8 md:grid-cols-3 lg:gap-12">
        <Definition term="Tables">
          Typed columns, a grid people edit by hand, CSV in and out.
        </Definition>
        <Definition term="Stores">
          One JSON document under a schema you define. The state a job carries
          between runs.
        </Definition>
        <Definition term="Files">
          Anything, viewed in place: a PDF, an image, a page of notes. Jori
          saves what they make and marks it as their own.
        </Definition>
      </dl>
      {/* The pages keep the product's widths, so the frame takes the full
          width under the definitions rather than a column beside them:
          every column of the table the hero's job keeps stays in view. */}
      <Tabs
        className="mt-12"
        onValueChange={(path) => console.navigation.navigate(path)}
        value={console.location.pathname}
      >
        <TabsList>
          {pages.map((page) => (
            <TabsTrigger key={page.path} value={page.path}>
              {page.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DemoConsole
        className="mt-4 h-[26rem]"
        navigation={console}
        sidebar={false}
      />
    </Section>
  )
}
