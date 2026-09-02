import { DemoWorkspaceProvider } from "../demo/provider"
import { MarketingShell } from "../shell"
import { Hero } from "./hero"
import { Infrastructure } from "./infrastructure"
import { Chores } from "./mocks/chores"
import { Jobs } from "./mocks/jobs"
import { Materials } from "./mocks/materials"
import { Record } from "./mocks/record"
import { Sharing } from "./mocks/sharing"
import { Usage } from "./mocks/usage"
import { Surfaces } from "./surfaces"

/** The argument in order: the drive, the chores it takes, what a job is,
 *  where its work lands, what it costs, who sees it, the record it keeps,
 *  the surfaces that reach it, and where it runs. One workspace under all
 *  of it, so a job created in one section shows up in the next. */
export function Landing() {
  return (
    <MarketingShell closing="We're running paid pilots with a few teams at a time, set up by us. Tell us what your team does by hand every week, and we'll be in touch if it's a fit.">
      <DemoWorkspaceProvider>
        <Hero />
        <Chores />
        <Jobs />
        <Materials />
        <Usage />
        <Sharing />
        <Record />
        <Surfaces />
        <Infrastructure />
      </DemoWorkspaceProvider>
    </MarketingShell>
  )
}
