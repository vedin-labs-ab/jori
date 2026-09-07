import { type ModelRate, modelRate } from "../../contracts/models/catalog"
import { type QueryLikeCtx } from "../shared/context"
import { findModel } from "./window"

/** The rate usage is priced at: the listing's as last fetched, or the
 *  catalog's until a refresh has run. */
export async function liveModelRate(
  ctx: QueryLikeCtx,
  model: string
): Promise<ModelRate> {
  const listed = await findModel(ctx, model)

  return listed === null ? modelRate(model) : listed.rate
}
