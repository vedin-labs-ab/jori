import { type GenericId } from "convex/values"

/** A readable id cast to the branded id the views expect: the demo has no
 *  database to mint real ones, and a name reads better in a link. */
export function demoId<Table extends string>(table: Table, name: string) {
  return `${table}_${name}` as GenericId<Table>
}

/** What mints the ids a session adds: one per table, in the order made. */
export type DemoMint = <Table extends string>(table: Table) => GenericId<Table>
