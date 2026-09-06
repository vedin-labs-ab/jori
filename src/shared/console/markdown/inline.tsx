import { type Token, type Tokens } from "marked"
import { type ReactNode } from "react"
import { ConsoleLink } from "../shell/link"
import { childTokens, decodeEntities } from "./text"

// A paragraph's runs as elements. Everything is text under React, so a
// tag in the source is shown as the characters it is made of.

const externalHref = /^https?:\/\//i

export function InlineTokens({ tokens }: { tokens: Token[] }) {
  return tokens.map((token, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the runs are rendered once per text and never reorder
    <InlineToken key={index} token={token} />
  ))
}

function InlineToken({ token }: { token: Token }): ReactNode {
  switch (token.type) {
    case "text":
      return textRun(token as Tokens.Text)
    case "escape":
      return (token as Tokens.Escape).text
    case "strong":
      return <strong>{children(token)}</strong>
    case "em":
      return <em>{children(token)}</em>
    case "del":
      return <del>{children(token)}</del>
    case "codespan":
      return <code>{decodeEntities((token as Tokens.Codespan).text)}</code>
    case "br":
      return <br />
    case "link":
      return <MarkdownLink token={token as Tokens.Link} />
    case "image":
      return <MarkdownImage token={token as Tokens.Image} />
    case "checkbox":
      return <TaskMark checked={(token as Tokens.Checkbox).checked} />
    case "html":
      return (token as Tokens.HTML).text
    default: {
      const nested = childTokens(token)

      return nested === undefined ? token.raw : <InlineTokens tokens={nested} />
    }
  }
}

/** A text token inside a tight list item is a block holding its own runs;
 *  anywhere else it is the run itself. */
function textRun(token: Tokens.Text) {
  return token.tokens === undefined ? (
    decodeEntities(token.text)
  ) : (
    <InlineTokens tokens={token.tokens} />
  )
}

function children(token: Token) {
  return <InlineTokens tokens={childTokens(token) ?? []} />
}

/** A link into the console stays in the console; a link out opens a new
 *  tab without a referrer; any other scheme is not a link at all. */
function MarkdownLink({ token }: { token: Tokens.Link }) {
  const label = children(token)

  if (token.href.startsWith("/")) {
    return <ConsoleLink to={token.href}>{label}</ConsoleLink>
  }

  if (!externalHref.test(token.href)) {
    return label
  }

  return (
    <a href={token.href} rel="noopener noreferrer" target="_blank">
      {label}
    </a>
  )
}

/** An image is offered as a link to it rather than loaded: a reply must
 *  not fetch from wherever it likes as soon as it is read. */
function MarkdownImage({ token }: { token: Tokens.Image }) {
  return externalHref.test(token.href) ? (
    <a href={token.href} rel="noopener noreferrer" target="_blank">
      {token.text === "" ? token.href : token.text}
    </a>
  ) : (
    token.text
  )
}

/** A task item's box, as a fact rather than a control: the item said it
 *  is done or not. */
export function TaskMark({ checked }: { checked: boolean }) {
  return (
    <input
      aria-label={checked ? "Done" : "Not done"}
      checked={checked}
      className="mr-1.5 align-[-0.125em] accent-primary"
      readOnly
      type="checkbox"
    />
  )
}
