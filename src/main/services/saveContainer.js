import zlib from "node:zlib";
import fs from "node:fs";

const MAGIC = "FBCHUNKS", PAYLOAD_OFFSET = 0x52, LENGTH_OFFSET = 0x4a, LENGTH_BYTES = 3;

export function validateSaveContainer(bytes, expectedLength = null) {
  if (!Buffer.isBuffer(bytes) || bytes.length <= PAYLOAD_OFFSET || bytes.subarray(0, MAGIC.length).toString("ascii") !== MAGIC) throw new Error("Unsupported packed save container. The original save was kept unchanged.");
  if (expectedLength !== null && bytes.length !== expectedLength) throw new Error("The packed save exceeded or changed its reserved file size. The original save was kept unchanged.");
  const compressedLength = bytes.readUIntLE(LENGTH_OFFSET, LENGTH_BYTES);
  if (compressedLength <= 0 || compressedLength > bytes.length - PAYLOAD_OFFSET) throw new Error("The packed save declares an invalid compressed-data length. The original save was kept unchanged.");
  const decoded = zlib.inflateSync(bytes.subarray(PAYLOAD_OFFSET), { info: true });
  if (decoded.engine.bytesWritten !== compressedLength) throw new Error("The packed save's compressed-data length does not match its header. The original save was kept unchanged.");
  return { fileLength: bytes.length, payloadCapacity: bytes.length - PAYLOAD_OFFSET, compressedLength };
}

// CFB reserves a fixed-size FBCHUNKS file. Its compressed payload may grow into
// the existing padding, but the file itself must not grow. The dependency's
// generic writer concatenates a larger stream when that reserve is exhausted.
// Retain the game's container and every unpacked byte; retry lossless deflate
// at level 9 if the default level doesn't fit. Never truncate or drop changes.
export function packFixedSaveContainer(original, proposedCompressed) {
  const layout = validateSaveContainer(original);
  let compressed = proposedCompressed;
  if (!Buffer.isBuffer(compressed)) throw new Error("Invalid compressed save data. The original save was kept unchanged.");
  if (compressed.length > layout.payloadCapacity) {
    const unpacked = zlib.inflateSync(compressed);
    compressed = zlib.deflateSync(unpacked, { level: 9, windowBits: 15 });
    if (!zlib.inflateSync(compressed).equals(unpacked)) throw new Error("Save compression changed the payload. The original save was kept unchanged.");
  }
  if (compressed.length > layout.payloadCapacity || compressed.length > 0xffffff) throw new Error("The updated equipment cannot fit within this save's reserved file size, even with stronger lossless compression. Use a smaller player scope or fewer correction passes. The original save was kept unchanged.");
  const packed = Buffer.from(original);
  compressed.copy(packed, PAYLOAD_OFFSET);
  packed.writeUIntLE(compressed.length, LENGTH_OFFSET, LENGTH_BYTES);
  validateSaveContainer(packed, layout.fileLength);
  return packed;
}

export async function writeFixedSaveCandidate(franchise, destination) {
  if (!franchise.strategy?.file?.generateUnpackedContents || !Buffer.isBuffer(franchise.packedFileContents)) return franchise.save(destination); // Lightweight test doubles.
  // Use the dependency's existing table serializer, then our bounded container
  // packer. Its generic save Promise doesn't propagate postPackFile exceptions;
  // doing the bounded pack here makes a capacity failure reject normally.
  const unpacked = franchise.strategy.file.generateUnpackedContents(franchise.tables, franchise.unpackedFileContents);
  const compressed = zlib.deflateSync(unpacked, { windowBits: 15 });
  const packed = packFixedSaveContainer(franchise.packedFileContents, compressed);
  if (!zlib.inflateSync(packed.subarray(PAYLOAD_OFFSET)).equals(unpacked)) throw new Error("Packed save data differs from the serialized candidate. The original save was kept unchanged.");
  await fs.promises.writeFile(destination, packed);
}
