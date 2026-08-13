/**
 * Converts the source human base mesh (Wavefront OBJ) into a compact binary
 * the browser can download quickly.
 *
 *   node scripts/build-avatar-mesh.mjs
 *
 * The source OBJ is ~2.5 MB of ASCII with quad faces and baked normals. We:
 *   1. triangulate the quads,
 *   2. drop the normals entirely — the avatar is deformed per user, so normals
 *      have to be recomputed at runtime anyway,
 *   3. recentre the model on the origin and normalise it to 1.0 units tall, so
 *      the renderer never has to care about the source model's scale,
 *   4. quantise positions to Int16, which is ~0.00002 units of error at this
 *      scale — far below anything visible.
 *
 * Output: public/models/human-base.bin
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(HERE, '../FinalBaseMesh.obj')
const OUTPUT = resolve(HERE, '../public/models/human-base.bin')

const MAGIC = 0x4d4e594b // "KYNM" little-endian

function parseObj(text) {
  const positions = []
  const indices = []

  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const parts = line.trim().split(/\s+/)
      positions.push(+parts[1], +parts[2], +parts[3])
      continue
    }
    if (!line.startsWith('f ')) continue

    // Faces look like "f 1//1 2//2 3//3 4//4" — take the position index only.
    const corners = line
      .trim()
      .split(/\s+/)
      .slice(1)
      .map((token) => Number.parseInt(token.split('/')[0], 10) - 1)

    // Fan-triangulate: works for both quads and any convex n-gon.
    for (let i = 1; i < corners.length - 1; i += 1) {
      indices.push(corners[0], corners[i], corners[i + 1])
    }
  }

  return { positions, indices }
}

function main() {
  const text = readFileSync(SOURCE, 'utf8')
  const { positions, indices } = parseObj(text)

  const vertexCount = positions.length / 3
  const triangleCount = indices.length / 3

  if (!vertexCount || !triangleCount) {
    throw new Error('Parsed no geometry from the source OBJ.')
  }

  // --- Normalise: centre on X/Z, sit feet at y=0, scale to unit height -----
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);     maxX = Math.max(maxX, positions[i])
    minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1])
    minZ = Math.min(minZ, positions[i + 2]); maxZ = Math.max(maxZ, positions[i + 2])
  }

  const height = maxY - minY
  const scale = 1 / height
  const centreX = (minX + maxX) / 2
  const centreZ = (minZ + maxZ) / 2

  const normalised = new Float32Array(positions.length)
  for (let i = 0; i < positions.length; i += 3) {
    normalised[i] = (positions[i] - centreX) * scale
    normalised[i + 1] = (positions[i + 1] - minY) * scale // feet at y = 0
    normalised[i + 2] = (positions[i + 2] - centreZ) * scale
  }

  // --- Quantise to Int16 ---------------------------------------------------
  let extent = 0
  for (let i = 0; i < normalised.length; i += 1) {
    extent = Math.max(extent, Math.abs(normalised[i]))
  }
  const quantScale = extent / 32767

  const quantised = new Int16Array(normalised.length)
  for (let i = 0; i < normalised.length; i += 1) {
    quantised[i] = Math.round(normalised[i] / quantScale)
  }

  const use32BitIndices = vertexCount > 65535
  const indexArray = use32BitIndices ? new Uint32Array(indices) : new Uint16Array(indices)

  // --- Pack ----------------------------------------------------------------
  // header: magic, vertexCount, triangleCount, indexBits, quantScale = 20 bytes
  const HEADER_BYTES = 20
  const positionBytes = quantised.byteLength
  const padding = (4 - ((HEADER_BYTES + positionBytes) % 4)) % 4
  const total = HEADER_BYTES + positionBytes + padding + indexArray.byteLength

  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)

  view.setUint32(0, MAGIC, true)
  view.setUint32(4, vertexCount, true)
  view.setUint32(8, triangleCount, true)
  view.setUint32(12, use32BitIndices ? 32 : 16, true)
  view.setFloat32(16, quantScale, true)

  new Int16Array(buffer, HEADER_BYTES, quantised.length).set(quantised)
  const indexOffset = HEADER_BYTES + positionBytes + padding
  if (use32BitIndices) {
    new Uint32Array(buffer, indexOffset, indexArray.length).set(indexArray)
  } else {
    new Uint16Array(buffer, indexOffset, indexArray.length).set(indexArray)
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, Buffer.from(buffer))

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`
  console.log(`Source height ${height.toFixed(3)} units -> normalised to 1.0`)
  console.log(`Vertices  ${vertexCount}`)
  console.log(`Triangles ${triangleCount}`)
  console.log(`Indices   ${use32BitIndices ? 'Uint32' : 'Uint16'}`)
  console.log(`Written   ${OUTPUT} (${kb(total)})`)
}

main()
