import { notionApiVersion } from "../../../providers/notion/config"

export function createNotionTokenPreflightCommand() {
  return notionTokenPreflightCommand
}

const notionTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_NOTION_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Notion access token');",
  "  }",
  "  const response = await fetch('https://api.notion.com/v1/users/me', {",
  "    headers: {",
  "      authorization: 'Bearer ' + token,",
  `      'notion-version': ${JSON.stringify(notionApiVersion)},`,
  "    },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error('Notion token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('Notion token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")
