export async function fetchFormToken<Result>(
  url: string,
  body: Record<string, string>
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  })

  return (await response.json()) as Result
}
