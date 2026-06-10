export function createLinearTokenPreflightCommand() {
  return linearTokenPreflightCommand
}

const linearTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_LINEAR_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Linear access token');",
  "  }",
  "  const response = await fetch('https://api.linear.app/graphql', {",
  "    method: 'POST',",
  "    headers: {",
  "      authorization: 'Bearer ' + token,",
  "      'content-type': 'application/json',",
  "    },",
  "    body: JSON.stringify({ query: 'query MiloLinearPreflight { viewer { id } }' }),",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok || body.errors) {",
  "    throw new Error('Linear token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('Linear token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")
