// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { Table, TableBody, TableCell, TableFrame, TableRow } from "./table"

afterEach(cleanup)

test("frames tables with the shared surface inset", () => {
  render(
    <TableFrame data-testid="frame">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Member</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableFrame>
  )

  const frame = screen.getByTestId("frame")
  expect(frame.className).toContain("rounded-lg")
  expect(frame.className).toContain("[&_td:first-child]:pl-4")
})
