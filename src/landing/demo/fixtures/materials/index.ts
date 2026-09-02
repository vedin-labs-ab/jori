import { type DemoMaterial } from "../types"
import { demoFiles } from "./files"
import { demoStores } from "./stores"
import { demoTables } from "./tables"

/** The materials filed across Copperline's folders: a table, a store, or a
 *  file per team, and the renewals table the whole page comes back to. */
export function demoMaterials(now: number): DemoMaterial[] {
  return [...demoTables(now), ...demoStores(now), ...demoFiles(now)]
}
