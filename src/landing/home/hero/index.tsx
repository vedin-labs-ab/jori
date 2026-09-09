import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { brandHeadline } from "@/shared/brand/content"
import { GetStarted } from "../../cta"
import { DemoConsole } from "../../demo/console"
import { folderId } from "../../demo/fixtures/folders"
import { jobId } from "../../demo/fixtures/jobs"
import { renewalsTableId } from "../../demo/fixtures/materials/tables"
import { useDemoNavigation } from "../../demo/navigation"
import { Mention } from "../../section"
import { RenewalsThread } from "./thread"

/** The console opens on the folder the thread files into, and the row the
 *  thread names dips once after Jori's reply has landed: a reverse-first
 *  alternate of the entrance fade, so it settles where it started. All of
 *  it is CSS, so the server's markup is the client's, and none of it runs
 *  where the reader has asked for less motion. */
const consoleClassName = cn(
  "h-[36rem]",
  "motion-safe:[&_tr:has(a[href$=renewals])]:animate-in motion-safe:[&_tr:has(a[href$=renewals])]:fade-in-40",
  "motion-safe:[&_tr:has(a[href$=renewals])]:direction-alternate-reverse motion-safe:[&_tr:has(a[href$=renewals])]:repeat-2",
  "motion-safe:[&_tr:has(a[href$=renewals])]:animation-duration-400 motion-safe:[&_tr:has(a[href$=renewals])]:delay-[1900ms]",
  "motion-safe:[&_tr:has(a[href$=renewals])]:fill-mode-both"
)

export function Hero() {
  const console = useDemoNavigation(`/folders/${folderId("renewals")}`)

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 pb-24 md:pt-24 md:pb-32">
      <div className="max-w-3xl">
        {/* Plain text flow rather than a flex row. As flex items, the chip and
            the sentence were separated by the row's gap on top of the space
            already inside the text and the chip's own padding, which read as
            a wider space than the ones between the words after it. */}
        <p className="text-muted-foreground text-sm">
          <Mention /> answers in <Surface logo="slack" name="Slack" />,{" "}
          <Surface logo="github" name="GitHub" />,{" "}
          <Surface logo="linear" name="Linear" />, and more
        </p>
        <h1 className="mt-5 font-medium text-5xl text-balance tracking-tight sm:text-6xl lg:text-7xl">
          {brandHeadline}
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
          Put the jobs nobody wants next to the tables and files they keep
          current, in folders shaped like your teams and projects. Who can see a
          folder, and what it costs to run, come with it.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <GetStarted prominent />
          <Button asChild size="xl" variant="outline">
            <a href="#work">
              See how it works
              <ArrowDown data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>
      {/* The console takes the full width under the copy, so its sidebar,
          breadcrumb, and every list column have the room they have in the
          product. The thread hangs off its lower right corner, and the
          wrapper keeps room under the console for the part that hangs
          below it. Narrow, the thread docks under the console instead. */}
      <div className="relative mt-14 min-w-0 md:mt-16 md:pb-16">
        <DemoConsole className={consoleClassName} navigation={console} />
        <RenewalsThread
          className="mt-4 md:absolute md:right-6 md:bottom-0 md:mt-0 md:w-[22rem]"
          onOpenJob={() =>
            console.navigation.navigate(`/jobs/${jobId("watch")}`)
          }
          onOpenTable={() =>
            console.navigation.navigate(`/tables/${renewalsTableId}`)
          }
        />
      </div>
    </section>
  )
}

/** A surface Jori answers on, named beside its own mark so the three read
 *  as the products they are rather than a list of words. */
function Surface({ logo, name }: { logo: string; name: string }) {
  return (
    <span className="whitespace-nowrap text-foreground">
      <img
        alt=""
        className="mr-1 inline-block size-3.5 rounded-sm align-[-0.2em]"
        src={`/logos/integrations/${logo}.svg`}
      />
      {name}
    </span>
  )
}
