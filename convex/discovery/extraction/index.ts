"use node"

import { v } from "convex/values"
import { maxFileBytes } from "../../../contracts/runtime/files"
import { type ActionCtx, internalAction } from "../../_generated/server"
import { discoveryRegion } from "../region"
import { extractMedia } from "./media"
import { extractPdf } from "./pdf"
import { extractText } from "./text"
import { bounded, CoverageError, type Extraction } from "./types"

export const extract = internalAction({
  args: {
    storageId: v.id("_storage"),
    organizationId: v.string(),
    sourceKey: v.string(),
    revision: v.string(),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Extraction> => {
    try {
      discoveryRegion()
      const blob = await ctx.storage.get(args.storageId)
      if (!blob) {
        throw new CoverageError("failed", "Stored file content is missing.")
      }
      if (blob.size > maxFileBytes) {
        throw new CoverageError(
          "too_large",
          "The file exceeds the 25 MB extraction limit."
        )
      }
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const mime = (args.mimeType || blob.type)
        .split(";")[0]
        .trim()
        .toLowerCase()
      const source = {
        organizationId: args.organizationId,
        sourceKey: args.sourceKey,
        revision: args.revision,
      }
      const name = args.fileName.toLowerCase()
      if (
        /^(audio|video)\//.test(mime) ||
        /\.(mp3|wav|m4a|mp4|mov|webm|ogg|flac|aac)$/.test(name)
      ) {
        const result = await extractMedia(ctx, source, bytes, "audio")
        return bounded(
          videoCoverage(
            result,
            mime.startsWith("video/") || /\.(mp4|mov|webm)$/.test(name)
          )
        )
      }
      if (mime === "application/msword" || name.endsWith(".doc")) {
        return bounded(await extractMedia(ctx, source, bytes, "doc"))
      }
      if (
        mime.startsWith("image/") ||
        /\.(png|jpe?g|webp|tiff?|bmp)$/.test(name)
      ) {
        return bounded(await extractMedia(ctx, source, bytes, "image"))
      }
      if (mime === "application/pdf" || name.endsWith(".pdf")) {
        return bounded(await pdf(ctx, source, bytes))
      }
      return bounded({
        sections: extractText(bytes, name, mime),
        coverage: "complete",
      })
    } catch (error) {
      // Parser and provider errors can include file content. Only fixed messages leave this action.
      return error instanceof CoverageError
        ? { sections: [], coverage: error.coverage, reason: error.message }
        : {
            sections: [],
            coverage: "failed",
            reason:
              "The file could not be extracted. It may be encrypted or damaged.",
          }
    }
  },
})

async function pdf(
  ctx: ActionCtx,
  source: { organizationId: string; sourceKey: string; revision: string },
  bytes: Uint8Array
): Promise<Extraction> {
  const result = await extractPdf(bytes)
  if (!result.recognition.length) {
    return {
      sections: result.sections,
      coverage: result.partial ? "partial" : "complete",
    }
  }
  try {
    const ocr = await extractMedia(
      ctx,
      source,
      bytes,
      "pdf",
      result.recognition
    )
    const sections = result.sections.map((section) => {
      const recognized = ocr.sections.find(
        (candidate) => candidate.page === section.page
      )
      if (!recognized?.text.trim()) {
        return section
      }
      // OCR supplies the whole rendered page, preserving a page anchor but no
      // fabricated offsets into the PDF's independent embedded text stream.
      return {
        ...recognized,
        text: [section.text, recognized.text].filter(Boolean).join("\n"),
      }
    })
    return {
      sections,
      coverage:
        result.partial || ocr.coverage === "partial" ? "partial" : "ocr",
      ...(ocr.reason ? { reason: ocr.reason } : {}),
    }
  } catch {
    return {
      sections: result.sections,
      coverage: "partial",
      retryable: true,
      reason:
        "Selectable PDF text is indexed; image text could not be recognized.",
    }
  }
}

function videoCoverage(result: Extraction, video: boolean): Extraction {
  return video
    ? {
        ...result,
        coverage: "partial",
        reason: "Audio is transcribed; video frames are not indexed.",
      }
    : result
}
