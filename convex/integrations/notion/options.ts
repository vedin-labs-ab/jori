import { optionalString, readArray } from "../../shared/input"
import {
  maxOptions,
  type OptionLoaderArgs,
  readRecord,
  requiredOptionString,
} from "../options/common"
import { notionJson } from "./api"
import { requireNotionCredentials } from "./credentials"
import { notionPageTitle } from "./pages"

export async function searchNotionObjects(args: OptionLoaderArgs) {
  const credentials = requireNotionCredentials(args.integration)
  const result = await notionJson(
    credentials.tokens.access,
    "POST",
    "/search",
    {
      query: args.query,
      page_size: maxOptions,
      filter: { property: "object", value: "page" },
    }
  )

  return readArray(result.results).map((item) => {
    const object = readRecord(item)

    return {
      value: requiredOptionString(object.id),
      label: notionPageTitle(object) ?? requiredOptionString(object.id),
      description: optionalString(object.url),
    }
  })
}
