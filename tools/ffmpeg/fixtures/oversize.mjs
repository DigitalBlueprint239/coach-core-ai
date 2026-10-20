// FILM-S2a adversarial fixtures: oversized / malformed box-size declarations.
// Derived deterministically from a known-good MP4 (s10) by rewriting size
// fields only; no large allocation, no new media content.
//   node oversize.mjs <known-good.mp4> <out-dir>
import {readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error("usage: oversize.mjs <known-good.mp4> <out-dir>");
const good = readFileSync(src);
if (good.toString("latin1", 4, 8) !== "ftyp") throw new Error("source must start with ftyp");
const ftypSize = good.readUInt32BE(0);
if (good.toString("latin1", ftypSize + 4, ftypSize + 8) !== "moov") {
  throw new Error("source must be faststart (moov right after ftyp)");
}

// a: real file, but `moov` declares 0x7FFFFFF0 bytes (32-bit size, ~2 GiB).
const a = Buffer.from(good);
a.writeUInt32BE(0x7FFFFFF0, ftypSize);
writeFileSync(join(out, "s11a-oversized-moov-size.mp4"), a);

// b: ftyp + a `moov` header using 64-bit largesize 2^62, then 16 zero bytes.
const b = Buffer.alloc(ftypSize + 16 + 16);
good.copy(b, 0, 0, ftypSize);
b.writeUInt32BE(1, ftypSize);
b.write("moov", ftypSize + 4, "latin1");
b.writeBigUInt64BE(1n << 62n, ftypSize + 8);
writeFileSync(join(out, "s11b-oversized-largesize-header-only.mp4"), b);

// c: real file, but the first box (`ftyp`) declares 0xFFFFFFFF bytes.
const c = Buffer.from(good);
c.writeUInt32BE(0xFFFFFFFF, 0);
writeFileSync(join(out, "s11c-oversized-ftyp-size.mp4"), c);
