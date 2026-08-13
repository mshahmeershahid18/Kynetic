/**
 * Loads the packed human base mesh produced by scripts/build-avatar-mesh.mjs.
 *
 * Format (little-endian):
 *   0  uint32   magic "KYNM"
 *   4  uint32   vertexCount
 *   8  uint32   triangleCount
 *   12 uint32   indexBits (16 or 32)
 *   16 float32  quantisation scale
 *   20 int16[]  positions, vertexCount * 3
 *      (padded to a 4-byte boundary)
 *      uint16[] or uint32[] indices, triangleCount * 3
 */

const MAGIC = 0x4d4e594b
const HEADER_BYTES = 20
const MESH_URL = '/models/human-base.bin'

export type BaseMesh = {
  positions: Float32Array
  indices: Uint16Array | Uint32Array
  vertexCount: number
}

let cache: Promise<BaseMesh> | null = null

export function loadBaseMesh(): Promise<BaseMesh> {
  // The mesh is immutable and shared by every avatar on the page.
  if (!cache) {
    cache = fetchMesh().catch((error) => {
      cache = null // let a later mount retry after a transient failure
      throw error
    })
  }
  return cache
}

async function fetchMesh(): Promise<BaseMesh> {
  const response = await fetch(MESH_URL)
  if (!response.ok) {
    throw new Error(`Could not load the avatar mesh (${response.status}).`)
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength < HEADER_BYTES) {
    throw new Error('Avatar mesh file is truncated.')
  }

  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== MAGIC) {
    throw new Error('Avatar mesh file is not in the expected format.')
  }

  const vertexCount = view.getUint32(4, true)
  const triangleCount = view.getUint32(8, true)
  const indexBits = view.getUint32(12, true)
  const quantScale = view.getFloat32(16, true)

  const positionCount = vertexCount * 3
  const quantised = new Int16Array(buffer, HEADER_BYTES, positionCount)

  const positions = new Float32Array(positionCount)
  for (let i = 0; i < positionCount; i += 1) {
    positions[i] = quantised[i] * quantScale
  }

  const positionBytes = quantised.byteLength
  const padding = (4 - ((HEADER_BYTES + positionBytes) % 4)) % 4
  const indexOffset = HEADER_BYTES + positionBytes + padding
  const indexCount = triangleCount * 3

  const indices =
    indexBits === 32
      ? new Uint32Array(buffer.slice(indexOffset, indexOffset + indexCount * 4))
      : new Uint16Array(buffer.slice(indexOffset, indexOffset + indexCount * 2))

  return { positions, indices, vertexCount }
}
