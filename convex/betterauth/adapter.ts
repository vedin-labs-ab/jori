import { createApi } from "@convex-dev/better-auth"
import { createAdapterOptions } from "../auth"
import schema from "./schema"

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAdapterOptions)
