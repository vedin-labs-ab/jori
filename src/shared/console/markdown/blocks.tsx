import { type Token, type Tokens } from "marked"
import { type ReactNode } from "react"
import { CodeBlock } from "./code"
import { InlineTokens, TaskMark } from "./inline"
import { childTokens, decodeEntities } from "./text"

// The blocks a reply is laid out in, each the element the prose scale
// addresses (see style.ts).

export function BlockTokens({ tokens }: { tokens: Token[] }) {
  return tokens.map((token, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the blocks are rendered once per text and never reorder
    <BlockToken key={index} token={token} />
  ))
}

function BlockToken({ token }: { token: Token }): ReactNode {
  switch (token.type) {
    case "paragraph":
      return <p>{inline(token)}</p>
    case "heading":
      return (
        <Heading depth={(token as Tokens.Heading).depth}>
          {inline(token)}
        </Heading>
      )
    case "list":
      return <List token={token as Tokens.List} />
    case "blockquote":
      return (
        <blockquote>
          <BlockTokens tokens={(token as Tokens.Blockquote).tokens} />
        </blockquote>
      )
    case "code":
      return <Code token={token as Tokens.Code} />
    case "table":
      return <Table token={token as Tokens.Table} />
    case "hr":
      return <hr />
    case "html":
      return <p>{(token as Tokens.HTML).text}</p>
    case "text":
      return inline(token)
    case "checkbox":
      return <TaskMark checked={(token as Tokens.Checkbox).checked} />
    case "space":
    case "def":
      return null
    default:
      return childTokens(token) === undefined ? (
        <p>{token.raw}</p>
      ) : (
        inline(token)
      )
  }
}

function inline(token: Token) {
  return <InlineTokens tokens={childTokens(token) ?? []} />
}

function Heading({ children, depth }: { children: ReactNode; depth: number }) {
  switch (depth) {
    case 1:
      return <h1>{children}</h1>
    case 2:
      return <h2>{children}</h2>
    case 3:
      return <h3>{children}</h3>
    case 4:
      return <h4>{children}</h4>
    case 5:
      return <h5>{children}</h5>
    default:
      return <h6>{children}</h6>
  }
}

/** A list's items hold blocks when the list is loose and inline runs when
 *  it is tight; the block walker takes both. A task item's box is an
 *  inline token of its own. */
function List({ token }: { token: Tokens.List }) {
  const items = token.items.map((item, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the items are rendered once per text and never reorder
    <li className={item.task ? "list-none" : undefined} key={index}>
      <BlockTokens tokens={item.tokens} />
    </li>
  ))

  return token.ordered ? (
    <ol start={token.start === "" ? undefined : token.start}>{items}</ol>
  ) : (
    <ul>{items}</ul>
  )
}

function Code({ token }: { token: Tokens.Code }) {
  return (
    <CodeBlock
      code={decodeEntities(token.text)}
      language={(token.lang ?? "").trim().split(/\s+/)[0] ?? ""}
    />
  )
}

/** A table scrolls sideways inside its own box, so wide columns never
 *  widen the message. The box carries no margin of its own; the table's
 *  is inside it, as everywhere the prose scale applies. */
function Table({ token }: { token: Tokens.Table }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <table>
        <thead>
          <tr>
            {token.header.map((cell, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the cells are rendered once per text and never reorder
              <th key={index} style={alignment(cell)}>
                <InlineTokens tokens={cell.tokens} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {token.rows.map((row, rowIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the rows are rendered once per text and never reorder
            <tr key={rowIndex}>
              {row.map((cell, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: the cells are rendered once per text and never reorder
                <td key={index} style={alignment(cell)}>
                  <InlineTokens tokens={cell.tokens} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function alignment(cell: Tokens.TableCell) {
  return cell.align === null ? undefined : { textAlign: cell.align }
}
