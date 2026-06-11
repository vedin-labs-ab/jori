type GoogleRuntimeSurface = "gmail" | "googleCalendar" | "googleDrive"

export function createGoogleTokenPreflightCommand(
  surface: GoogleRuntimeSurface
) {
  if (surface === "gmail") {
    return gmailTokenPreflightCommand
  }

  if (surface === "googleCalendar") {
    return googleCalendarTokenPreflightCommand
  }

  return googleDriveTokenPreflightCommand
}

const gmailTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_GOOGLE_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Google Workspace access token');",
  "  }",
  "  await verify('Gmail profile', 'https://gmail.googleapis.com/gmail/v1/users/me/profile');",
  "  console.log('Gmail token preflight passed');",
  "}",
  "",
  "async function verify(label, url) {",
  "  const response = await fetch(url, {",
  "    headers: { authorization: 'Bearer ' + process.env.MILO_GOOGLE_ACCESS_TOKEN },",
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

const googleCalendarTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_GOOGLE_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Google Calendar access token');",
  "  }",
  "  const eventsUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');",
  "  eventsUrl.searchParams.set('maxResults', '1');",
  "  eventsUrl.searchParams.set('timeMin', new Date().toISOString());",
  "  await verify('Google Calendar events', eventsUrl.toString());",
  "  console.log('Google Calendar token preflight passed');",
  "}",
  "",
  "async function verify(label, url) {",
  "  const response = await fetch(url, {",
  "    headers: { authorization: 'Bearer ' + process.env.MILO_GOOGLE_ACCESS_TOKEN },",
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

const googleDriveTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_GOOGLE_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Google Drive access token');",
  "  }",
  "  const filesUrl = new URL('https://www.googleapis.com/drive/v3/files');",
  "  filesUrl.searchParams.set('pageSize', '1');",
  "  filesUrl.searchParams.set('fields', 'files(id)');",
  "  await verify('Google Drive files', filesUrl.toString());",
  "  console.log('Google Drive token preflight passed');",
  "}",
  "",
  "async function verify(label, url) {",
  "  const response = await fetch(url, {",
  "    headers: { authorization: 'Bearer ' + process.env.MILO_GOOGLE_ACCESS_TOKEN },",
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
