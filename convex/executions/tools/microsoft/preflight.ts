type MicrosoftRuntimeSurface = "microsoftCalendar" | "microsoftEmail"

export function createMicrosoftTokenPreflightCommand(
  surface: MicrosoftRuntimeSurface
) {
  return surface === "microsoftEmail"
    ? microsoftEmailTokenPreflightCommand
    : microsoftCalendarTokenPreflightCommand
}

const microsoftEmailTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_MICROSOFT_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Microsoft access token');",
  "  }",
  "  await verify('Microsoft Email messages', 'https://graph.microsoft.com/v1.0/me/messages?$top=1');",
  "  console.log('Microsoft Email token preflight passed');",
  "}",
  "",
  "async function verify(label, url) {",
  "  const response = await fetch(url, {",
  "    headers: { authorization: 'Bearer ' + process.env.MILO_MICROSOFT_ACCESS_TOKEN },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error(label + ' preflight failed: ' + JSON.stringify(body));",
  "  }",
  "}",
  "",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

const microsoftCalendarTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_MICROSOFT_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Microsoft access token');",
  "  }",
  "  await verify('Microsoft Calendar events', 'https://graph.microsoft.com/v1.0/me/events?$top=1');",
  "  console.log('Microsoft Calendar token preflight passed');",
  "}",
  "",
  "async function verify(label, url) {",
  "  const response = await fetch(url, {",
  "    headers: { authorization: 'Bearer ' + process.env.MILO_MICROSOFT_ACCESS_TOKEN },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error(label + ' preflight failed: ' + JSON.stringify(body));",
  "  }",
  "}",
  "",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")
