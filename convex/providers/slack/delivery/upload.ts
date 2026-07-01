import { type RunAsset } from "../../../assets/read"
import { requiredSlackResultString, slackFormApi, slackJsonApi } from "../api"

export async function postSlackFiles(
  token: string,
  args: {
    assets: RunAsset[]
    channel: string
    text: string
    thread_ts?: string
  }
) {
  const files = []

  for (const asset of args.assets) {
    files.push(await uploadSlackFile(token, asset))
  }

  return await slackJsonApi(token, "files.completeUploadExternal", {
    channel_id: args.channel,
    files,
    initial_comment: args.text,
    thread_ts: args.thread_ts,
  })
}

async function uploadSlackFile(token: string, asset: RunAsset) {
  const ticket = await slackFormApi(token, "files.getUploadURLExternal", {
    filename: asset.name,
    length: asset.bytes.byteLength,
    ...(asset.description === undefined || !asset.mimeType.startsWith("image/")
      ? {}
      : { alt_txt: asset.description.slice(0, 1000) }),
  })
  const uploadUrl = requiredSlackResultString(ticket, "upload_url")
  const fileId = requiredSlackResultString(ticket, "file_id")
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "content-type": asset.mimeType,
    },
    body: new Blob([copyBytesToArrayBuffer(asset.bytes)], {
      type: asset.mimeType,
    }),
  })

  if (!response.ok) {
    throw new Error(`Slack file upload failed: ${await response.text()}`)
  }

  return {
    id: fileId,
    title: asset.name,
  }
}

function copyBytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(buffer).set(bytes)

  return buffer
}
