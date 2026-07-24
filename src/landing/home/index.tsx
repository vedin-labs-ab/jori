import { MarketingShell } from "../shell"
import { Apps } from "./apps"
import { Control } from "./control"
import { Hero } from "./hero"
import { Start } from "./start"
import { Threads } from "./threads"

export function Landing() {
  return (
    <MarketingShell closing="Tell us what your team keeps doing by hand. We're setting up the first teams ourselves, so the fit matters more than the queue.">
      <Hero />
      <Apps />
      <Threads />
      <Control />
      <Start />
    </MarketingShell>
  )
}
