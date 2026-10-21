// FILM-S2b fixture helper: deterministic bitstream corruption that keeps
// the ISO-BMFF structure valid. XORs 64 bytes with 0xA5 at 30 %, 50 % and
// 70 % of the 'mdat' payload, so the structural check passes and only a
// full strict decode can detect the damage. Pure byte surgery; no decoder.
// Usage: node corrupt.mjs <in.mp4> <out.mp4>
import {readFileSync, writeFileSync} from "node:fs";

const [inp, outp] = process.argv.slice(2);
const b = Buffer.from(readFileSync(inp));
let off = 0;
let mdat = null;
while (off < b.length) {
  const size = b.readUInt32BE(off);
  if (size < 8) throw new Error(`bad box @${off}`);
  if (b.toString("latin1", off + 4, off + 8) === "mdat") mdat = [off, size];
  off += size;
}
if (!mdat) throw new Error("no mdat");
for (const frac of [0.3, 0.5, 0.7]) {
  const p = mdat[0] + 8 + Math.floor((mdat[1] - 8) * frac);
  for (let i = 0; i < 64; i++) b[p + i] ^= 0xa5;
}
writeFileSync(outp, b);
