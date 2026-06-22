export function renderPromptTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replaceAll(/{{\s*([^{}]*?)\s*}}/g, (_match, expression) =>
    renderPlaceholder(values, parsePlaceholder(expression))
  )
}

type Placeholder = {
  optional: boolean
  path: string
  prefix: string
  suffix: string
}

const missingValue = Symbol("missingValue")

function renderPlaceholder(
  values: Record<string, unknown>,
  placeholder: Placeholder
) {
  const value = resolveTemplateValue(
    values,
    placeholder.path,
    placeholder.optional
  )

  if (value === missingValue || value === undefined || value === null) {
    return ""
  }

  const rendered = String(value)

  return rendered.trim() === ""
    ? ""
    : `${placeholder.prefix}${rendered}${placeholder.suffix}`
}

function parsePlaceholder(expression: string): Placeholder {
  const optional = expression.trimStart().startsWith("?")
  const source = optional
    ? expression.trimStart().slice(1).trim()
    : expression.trim()
  const pathMatch = /^[\w.]+/.exec(source)

  if (pathMatch === null) {
    throw new Error(`Invalid prompt template placeholder: ${expression}`)
  }

  const path = pathMatch[0]
  const options = parseOptions(source.slice(path.length), expression)

  return {
    optional,
    path,
    prefix: options.prefix ?? "",
    suffix: options.suffix ?? "",
  }
}

function parseOptions(source: string, expression: string) {
  const options: Partial<Pick<Placeholder, "prefix" | "suffix">> = {}
  let remaining = source.trim()

  while (remaining !== "") {
    const match = /^(\w+)="((?:\\.|[^"\\])*)"/.exec(remaining)

    if (match === null) {
      throw new Error(`Invalid prompt template placeholder: ${expression}`)
    }

    const [, name, rawValue] = match

    if (name !== "prefix" && name !== "suffix") {
      throw new Error(`Unknown prompt template option: ${name}`)
    }

    if (options[name] !== undefined) {
      throw new Error(`Duplicate prompt template option: ${name}`)
    }

    options[name] = unescapeOptionValue(rawValue)
    remaining = remaining.slice(match[0].length).trim()
  }

  return options
}

function unescapeOptionValue(value: string) {
  const escapes: Record<string, string> = {
    '"': '"',
    "\\": "\\",
    n: "\n",
    r: "\r",
    t: "\t",
  }

  return value.replaceAll(/\\(.)/g, (_match, escaped: string) => {
    const unescaped = escapes[escaped]

    if (unescaped === undefined) {
      throw new Error(`Unsupported prompt template escape: \\${escaped}`)
    }

    return unescaped
  })
}

function resolveTemplateValue(
  values: Record<string, unknown>,
  path: string,
  optional: boolean
) {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (current === missingValue) {
      return missingValue
    }

    if (typeof current !== "object" || current === null || !(part in current)) {
      if (optional) {
        return missingValue
      }

      throw new Error(`Missing prompt template value: ${path}`)
    }

    return current[part as keyof typeof current]
  }, values)

  if (value === undefined || value === null) {
    if (optional) {
      return missingValue
    }

    throw new Error(`Missing prompt template value: ${path}`)
  }

  return value
}
