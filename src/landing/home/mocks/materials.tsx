import { Database, File, Table2 } from "lucide-react"
import { useId } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Jori } from "@/shared/brand"
import { DemoConsole } from "../../demo/console"
import { notesFileId } from "../../demo/fixtures/materials/files"
import { watchStoreId } from "../../demo/fixtures/materials/stores"
import { renewalsTableId } from "../../demo/fixtures/materials/tables"
import { useDemoNavigation } from "../../demo/navigation"
import { Definition, Section } from "../../section"

/** One of each material the hero's job touches, at the page the console
 *  gives it, named for its kind with the icon the console files it under,
 *  so the switch above the frame teaches the three apart while it walks
 *  the same console the crumb inside it does. */
const pages = [
  { icon: Table2, label: "Table", path: `/tables/${renewalsTableId}` },
  { icon: Database, label: "Store", path: `/stores/${watchStoreId}` },
  { icon: File, label: "File", path: `/files/${notesFileId}` },
]

/** The tab for wherever the console is: stepping from the notes to the
 *  next file, or up to the Files list, stays on File. Off the three
 *  sections entirely, no tab is lit. */
function activePath(pathname: string) {
  const section = pathname.split("/")[1]

  return pages.find((page) => page.path.split("/")[1] === section)?.path ?? ""
}

/** The materials pillar: the console's own page for a table, a store, and
 *  a file, one at a time, under the crumb that says where each lives. */
export function Materials() {
  const console = useDemoNavigation(pages[0].path)
  const id = useId()
  const selected = activePath(console.location.pathname)
  const panelId = `${id}-panel`

  return (
    <Section
      lede={
        <>
          <Jori tilt="steep" /> can update tables, save files, and keep track of
          work between runs. You can open and edit the same materials to check
          or correct the results.
        </>
      }
      title="Work lands where you can find it"
    >
      <dl className="grid gap-x-12 gap-y-8 md:grid-cols-3">
        <Definition term="Tables">
          Edit rows, choose column types, and import or export CSV files.
        </Definition>
        <Definition term="Stores">
          Keep data a job needs between runs, such as what it checked last. Each
          store holds a JSON document with a structure you define.
        </Definition>
        <Definition term="Files">
          Open PDFs, images, and notes in the workspace. Files Jori creates are
          marked so you can see who made them.
        </Definition>
      </dl>
      {/* The pages keep the product's widths, so the frame takes the full
          width under the definitions rather than a column beside them:
          every column of the table the hero's job keeps stays in view. */}
      <Tabs
        className="mt-12"
        onValueChange={(path) => console.navigation.navigate(path)}
        value={selected}
      >
        <TabsList aria-label="Materials">
          {pages.map((page) => (
            <TabsTrigger
              aria-controls={panelId}
              id={`${id}-${page.path}`}
              key={page.path}
              value={page.path}
            >
              <page.icon />
              {page.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {/* One panel keeps the console mounted as tabs change, including
          when navigation inside the demo leaves these material pages. */}
      <div
        aria-label={selected === "" ? "Materials" : undefined}
        aria-labelledby={selected === "" ? undefined : `${id}-${selected}`}
        id={panelId}
        role="tabpanel"
      >
        <DemoConsole
          lazy
          className="mt-4 h-[26rem]"
          navigation={console}
          sidebar={false}
        />
      </div>
    </Section>
  )
}
