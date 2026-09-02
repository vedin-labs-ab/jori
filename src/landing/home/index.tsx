import { MarketingShell } from "../shell"
import { Catalog } from "./catalog"
import { Contrast } from "./contrast"
import { Control } from "./control"
import { Hero } from "./hero"
import { Infrastructure } from "./infrastructure"
import { Jobs } from "./jobs"
import { Materials } from "./materials"
import { Surfaces } from "./surfaces"

/** The argument in order: one teammate the whole company shares, why shared
 *  beats private, the surfaces that reach it, the work you hand it, the
 *  materials it works on, the jobs it already does, and then the control and
 *  residency story that makes handing any of it over safe. The pillars hook
 *  the team; the last two sections close the owner. */
export function Landing() {
  return (
    <MarketingShell closing="We're running paid pilots with a few teams at a time, set up by us. Tell us what your team assembles by hand, and we'll be in touch if it's a fit.">
      <Hero />
      <Contrast />
      <Surfaces />
      <Jobs />
      <Materials />
      <Catalog />
      <Control />
      <Infrastructure />
    </MarketingShell>
  )
}
