import { MarketingShell } from "../shell"
import { Apps } from "./apps"
import { Context } from "./context"
import { Control } from "./control"
import { Hero } from "./hero"
import { Threads } from "./threads"

/** The argument in order: here is the app a team opens, here is how Jori
 *  works out what goes in it, here is how one lands, here is the rest you can
 *  just ask for, here is what it takes to hand any of it over. Context sits
 *  ahead of Apps because an app assembled from a model of the company is a
 *  different claim from an app someone described. */
export function Landing() {
  return (
    <MarketingShell closing="Tell us what your team keeps doing by hand. We're setting up the first teams ourselves, so the fit matters more than the queue.">
      <Hero />
      <Context />
      <Apps />
      <Threads />
      <Control />
    </MarketingShell>
  )
}
