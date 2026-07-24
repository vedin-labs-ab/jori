import { MarketingShell } from "../shell"
import { Apps } from "./apps"
import { Control } from "./control"
import { Hero } from "./hero"
import { Start } from "./start"
import { Threads } from "./threads"

export function Landing() {
  return (
    <MarketingShell>
      <Hero />
      <Apps />
      <Threads />
      <Control />
      <Start />
    </MarketingShell>
  )
}
