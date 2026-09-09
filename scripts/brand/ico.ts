/** ICO permits PNG frames; no second rasterizer is needed. */
export function iconFile(frames: { size: number; png: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * frames.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(frames.length, 4)
  let offset = header.length
  for (const [index, frame] of frames.entries()) {
    const entry = 6 + index * 16
    header.writeUInt8(frame.size, entry)
    header.writeUInt8(frame.size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(frame.png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += frame.png.length
  }
  return Buffer.concat([header, ...frames.map((frame) => frame.png)])
}
