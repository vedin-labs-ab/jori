import { notionApiUrl, notionApiVersion } from "../../providers/notion/config"
import { requireNotionCredentials } from "../../providers/notion/credentials"
import { notionPageTitle } from "../../providers/notion/pages"
import { fetchJson } from "../../shared/http"
import {
  maxOptions,
  type OptionLoaderArgs,
  optionalOptionString,
  readArray,
  readRecord,
  requiredOptionString,
} from "./common"

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

  return await fetchJson(notionApiUrl + path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${credentials.tokens.access}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body,
  })
}
