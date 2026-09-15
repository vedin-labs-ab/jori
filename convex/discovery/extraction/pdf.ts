"use node"

import "unpdf"
import { createRequire } from "node:module"
import { Worker } from "node:worker_threads"
import { CoverageError, type Section } from "./types"

type Pdf = { sections: Section[]; recognition: number[]; partial: boolean }

/** A fresh worker bounds parser memory and CPU even when one malformed page
 * never yields to a JavaScript timer. Ordinary PDFs need no external sandbox. */
export async function extractPdf(bytes: Uint8Array): Promise<Pdf> {
  const worker = new Worker(parser, {
    eval: true,
    workerData: {
      bytes,
      module: createRequire(import.meta.url).resolve("unpdf"),
    },
    resourceLimits: {
      maxOldGenerationSizeMb: 128,
      maxYoungGenerationSizeMb: 16,
    },
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await new Promise<Pdf>((resolve, reject) => {
      const fail = () =>
        reject(
          new CoverageError(
            "failed",
            "The PDF could not be parsed within 30 seconds and 128 MB. It may be encrypted or damaged."
          )
        )
      worker.once("message", (value: Pdf | null) =>
        value === null ? fail() : resolve(value)
      )
      worker.once("error", fail)
      worker.once("exit", (code) => {
        if (code !== 0) {
          fail()
        }
      })
      timer = setTimeout(fail, 30_000)
    })
  } finally {
    clearTimeout(timer)
    await worker.terminate()
  }
}

const parser = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const { getResolvedPDFJS } = require(workerData.module);
async function parse() {
  const { getDocument, OPS } = await getResolvedPDFJS();
  const task = getDocument({ data: new Uint8Array(workerData.bytes), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 1000) throw new Error('page limit');
    const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);
    const sections = [], recognition = [];
    const deadline = Date.now() + 25000;
    let length = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      if (Date.now() >= deadline) return { sections, recognition, partial: true };
      const document = await pdf.getPage(page);
      const content = await document.getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      length += text.length;
      if (length > 2000000) return { sections, recognition, partial: true };
      sections.push({ text, label: 'Page ' + page, page, start: 0, end: text.length });
      const operators = await document.getOperatorList();
      if (operators.fnArray.some(operation => imageOps.has(operation))) recognition.push(page);
      document.cleanup();
    }
    return { sections, recognition, partial: false };
  } finally { await task.destroy(); }
}
parse().then(result => parentPort.postMessage(result)).catch(() => parentPort.postMessage(null));
`
