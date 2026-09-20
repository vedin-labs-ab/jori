import { Jori } from "@/shared/brand"
import { Definition, Region, Section } from "../section"

/** Where it runs. The exception used to hide in a tooltip; a reader
 *  weighing residency wants it in the list, beside the claim it limits. */
export function Infrastructure() {
  return (
    <Section
      lede={
        <>
          Choose an EU or US workspace. <Jori tilt="slight" /> stores your
          chats, files and workspace records in your chosen region.
        </>
      }
      support
      title="Stored in your region"
    >
      <dl className="grid max-w-3xl gap-x-12 gap-y-8 md:grid-cols-2">
        <Definition term="Nothing shared between the two">
          Separate applications, databases and file storage in the{" "}
          <Region region="eu" /> and <Region region="us" />.
        </Definition>
        <Definition term="What leaves the region">
          Page fetching and billing use global services that may process data
          outside your chosen region.
        </Definition>
      </dl>
    </Section>
  )
}
