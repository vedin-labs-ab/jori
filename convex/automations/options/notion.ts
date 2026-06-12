import { fetchJson } from "../../broker/providers/common"
import { notionApiUrl, notionApiVersion } from "../../providers/notion/config"
import { requireNotionCredentials } from "../../providers/notion/credentials"
import {
  maxOptions,
  type OptionLoaderArgs,
  optionalOptionString,
  readArray,
  readRecord,
  requiredOptionString,
} from "./common"

export async function searchNotionObjects(
  args: OptionLoaderArgs,
  objectType: "database" | "page"
) {
  const result = await notionJson(args, "/search", {
    query: args.query,
    page_size: maxOptions,
    filter: { property: "object", value: objectType },
  })

  return readArray(result.results).map((item) => {
    const object = readRecord(item)

    return {
      value: requiredOptionString(object.id),
      label: notionTitle(object) ?? requiredOptionString(object.id),
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

function notionTitle(object: Record<string, unknown>) {
  const title = readArray(object.title)
    .map(notionRichTextPlainText)
    .join("")
    .trim()

  if (title !== "") {
    return title
  }

  const properties = readRecord(object.properties)

  for (const property of Object.values(properties).map(readRecord)) {
    if (property.type !== "title") {
      continue
    }

    const propertyTitle = readArray(property.title)
      .map(notionRichTextPlainText)
      .join("")
      .trim()

    if (propertyTitle !== "") {
      return propertyTitle
    }
  }

  return undefined
}

function notionRichTextPlainText(value: unknown) {
  const text = readRecord(value).plain_text

  return typeof text === "string" ? text : ""
}
