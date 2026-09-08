import { FieldHelp } from "@/shared/field"
import { RegionFlag } from "@/shared/region/flags"
import { Definition, Section } from "../section"

export function Infrastructure() {
  return (
    <Section
      lede={
        <>
          Choose an EU or US workspace. Jori stores your chats, files and
          workspace records in your chosen region.{" "}
          <FieldHelp label="Data residency scope and exceptions" side="top">
            Some features use services that process data outside your chosen
            region, including web search, code execution and billing.
          </FieldHelp>
        </>
      }
      support
      title="Region-specific data residency"
    >
      <dl className="grid max-w-3xl gap-x-12 gap-y-8 md:grid-cols-2">
        <Definition term="Data residency">
          Separate applications, databases and file storage in the{" "}
          <Region region="eu" /> and <Region region="us" />.
        </Definition>
        <Definition term="No seats, no markup">
          One price for the organization. Model work at the provider's list
          rates, drawn from prepaid credit with a cap you set.
        </Definition>
      </dl>
    </Section>
  )
}

/** A region named beside its flag, set in the foreground so the two
 *  choices stand out of the muted line that offers them. */
function Region({ region }: { region: "eu" | "us" }) {
  return (
    <span className="whitespace-nowrap font-medium text-foreground">
      <RegionFlag
        className="mr-1 inline-block align-[-0.125em]"
        region={region}
      />
      {region.toUpperCase()}
    </span>
  )
}
