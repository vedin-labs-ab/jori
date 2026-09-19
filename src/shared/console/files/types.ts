import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../../convex/_generated/api"

/** The console always serves a signed url; the demo and the layout states
 *  also show files with nothing behind them, so the kit takes either. */
type Unbacked<File extends { url: string }> = Omit<File, "url"> & {
  url: string | null
}

export type FileRow = Unbacked<
  FunctionReturnType<typeof api.files.console.list>[number]
>

export type FileDetail = Unbacked<
  NonNullable<FunctionReturnType<typeof api.files.console.get>["file"]>
>
