/**
 * A runtime wire identifier. The structural brand preserves collection safety
 * without making the shared contract depend on a database runtime.
 */
export type RuntimeId<Collection extends string> = string & {
  __tableName: Collection
}
