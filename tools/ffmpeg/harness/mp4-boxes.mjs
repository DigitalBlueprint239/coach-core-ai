// FILM-S2a reference structural check for ISO-BMFF (MP4/MOV) files.
//
// Why this exists: the pinned decoder TOLERATES some malformed size fields.
// For example, a valid file whose `moov` box declares 2 GiB still probes and
// decodes with exit 0 (measured with FFmpeg 6.1.1; the pinned 9.0.2 result is
// recorded by the harness). A decoder exit code alone can therefore report a
// false success for an oversized-header input. This check walks the box
// headers WITHOUT the decoder and rejects any declared size that does not fit
// the bytes actually present.
//
// Scope: test infrastructure for S2a. It is a reference for the S2b validator,
// not the validator itself, and makes no policy decisions (codecs, duration,
// resolution). Pure function over a Buffer; no I/O, no allocation driven by
// declared sizes.

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "udta", "mvex"]);
const MAX_DEPTH = 6;
const MAX_BOXES = 10_000;

/**
 * Walk boxes in buf[start, end). Every box must have size >= header length and
 * end inside its parent. size == 0 ("to end of file") is allowed only for the
 * last top-level box.
 * @param {Buffer} buf
 * @return {{ok: boolean, reason: ?string, boxes: object[]}}
 */
export function checkBoxes(buf) {
  const boxes = [];
  const fail = (reason) => ({ok: false, reason, boxes});
  if (!Buffer.isBuffer(buf)) throw new TypeError("buffer required");
  if (buf.length < 8) return fail("too-small");

  const walk = (start, end, depth, path) => {
    let off = start;
    while (off < end) {
      if (boxes.length >= MAX_BOXES) return "too-many-boxes";
      if (end - off < 8) return `trailing-bytes@${off}`;
      let size = buf.readUInt32BE(off);
      const type = buf.toString("latin1", off + 4, off + 8);
      if (!/^[\x20-\x7e]{4}$/.test(type)) return `invalid-type@${off}`;
      let header = 8;
      if (size === 1) {
        if (end - off < 16) return `truncated-largesize@${off}:${type}`;
        const big = buf.readBigUInt64BE(off + 8);
        if (big > BigInt(Number.MAX_SAFE_INTEGER)) return `oversized-box@${off}:${type}`;
        size = Number(big);
        header = 16;
      } else if (size === 0) {
        if (depth !== 0) return `size-zero-nested@${off}:${type}`;
        size = end - off;
      }
      if (size < header) return `undersized-box@${off}:${type}`;
      if (off + size > end) return `oversized-box@${off}:${type}:declared=${size}:available=${end - off}`;
      boxes.push({path: path ? `${path}/${type}` : type, offset: off, size});
      if (CONTAINERS.has(type) && depth < MAX_DEPTH) {
        const r = walk(off + header, off + size, depth + 1, path ? `${path}/${type}` : type);
        if (r) return r;
      }
      off += size;
    }
    return null;
  };

  const err = walk(0, buf.length, 0, "");
  if (err) return fail(err);
  const top = boxes.filter((b) => !b.path.includes("/")).map((b) => b.path);
  if (top[0] !== "ftyp") return fail("first-box-not-ftyp");
  if (top.filter((t) => t === "moov").length !== 1) return fail("moov-count-not-1");
  return {ok: true, reason: null, boxes};
}
