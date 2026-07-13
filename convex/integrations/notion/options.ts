import { fetchJsonObject } from "../../shared/http"
import {
  maxOptions,
  type OptionLoaderArgs,
  optionalOptionString,
  readArray,
  readRecord,
  requiredOptionString,
} from "../options/common"
import { notionApiUrl, notionApiVersion } from "./config"
import { requireNotionCredentials } from "./credentials"
import { notionPageTitle } from "./pages"

export async function searchNotionObjects(args: OptionLoaderArgs) {
  const result = await notionJson(args, "/search", {
    query: args.query,
    page_size: maxOptions,
    filter: { property: "object", value: "page" },
  })

  return readArray(result.results).map((item) => {
    const object = readRecord(item)

    return {
      value: requiredOptionString(object.id),
      label: notionPageTitle(object) ?? requiredOptionString(object.id),
      description: optionalOptionString(object.url),
    }
  })
}

async function notionJson(
  args: OptionLoaderArgs,
  path: string,
  body: Record<string, unknown>
) {
  const credentials = requireNotionCredentials(args.integration)

  return await fetchJsonObject(notionApiUrl + path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${credentials.tokens.access}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body,
  })
}
