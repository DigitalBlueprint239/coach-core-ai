// FILM-S2b fixture helper: replace every self-contained 'url ' data
// reference (flags=1) with an EXTERNAL Mac alias ('alis') reference to a
// sibling file named <canary-name>, growing the enclosing boxes. FFmpeg's mov
// demuxer resolves external tracks only from 'alis' records (a 'url '
// location string is ignored), and only relative to the input's directory
// (absolute paths are refused unless use_absolute_path is set). With
// nlvl_from = nlvl_to = 1 the target is "<dir of input>/<canary-name>", so a
// test can put a FIFO there: a decoder that follows the reference blocks.
// Requires moov AFTER mdat so chunk offsets (stco/co64) are unaffected.
// Pure byte surgery; no decoder. Usage:
//   node dref.mjs <in.mp4> <out.mp4> <canary-name>
import {readFileSync, writeFileSync} from "node:fs";

const [inp, outp, location] = process.argv.slice(2);
if (!inp || !outp || !location || !/^[A-Za-z0-9._-]{1,63}$/.test(location)) {
  throw new Error("usage: dref.mjs <in> <out> <canary-name>");
}

/** Mac alias record entry ('alis', flags 0 = external) -> Buffer. */
function aliasEntry(name) {
  const VOL = "vol";
  const fixed = Buffer.alloc(150); // record fields read by mov_read_dref
  fixed.writeUInt8(VOL.length, 10); fixed.write(VOL, 11, "latin1");
  fixed.writeUInt8(name.length, 50); fixed.write(name, 51, "latin1");
  fixed.writeUInt16BE(1, 130); fixed.writeUInt16BE(1, 132); // nlvl from/to
  let p = Buffer.from(`${VOL}:${name}`, "latin1");
  const plen = p.length;
  if (p.length % 2) p = Buffer.concat([p, Buffer.alloc(1)]);
  const tlv = Buffer.alloc(4); tlv.writeUInt16BE(2, 0); tlv.writeUInt16BE(plen, 2);
  const end = Buffer.from([0xff, 0xff, 0, 0]);
  const body = Buffer.concat([fixed, tlv, p, end]);
  const hdr = Buffer.alloc(12);
  hdr.writeUInt32BE(12 + body.length, 0); hdr.write("alis", 4, "latin1");
  hdr.writeUInt32BE(0, 8); // version 0, flags 0: data is EXTERNAL
  return Buffer.concat([hdr, body]);
}
const buf = readFileSync(inp);
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "dinf"]);

/** @return {{type, start, size, header}[]} children of [start, end) */
function children(b, start, end) {
  const out = [];
  for (let off = start; off < end;) {
    const size = b.readUInt32BE(off);
    if (size < 8 || off + size > end) throw new Error(`bad box @${off}`);
    out.push({type: b.toString("latin1", off + 4, off + 8), start: off, size});
    off += size;
  }
  return out;
}

/** Rebuild a box, rewriting nested 'url ' entries inside 'dref'. */
function rebuild(b, box) {
  const body = b.subarray(box.start + 8, box.start + box.size);
  let newBody;
  if (box.type === "dref") {
    // full box: version/flags(4) entry_count(4) then entries
    const head = body.subarray(0, 8);
    const entries = children(body, 8, body.length).map((e) => {
      const raw = body.subarray(e.start, e.start + e.size);
      if (e.type !== "url " || (raw.readUInt32BE(8) & 1) !== 1) return raw;
      return aliasEntry(location);
    });
    newBody = Buffer.concat([head, ...entries]);
  } else if (CONTAINERS.has(box.type)) {
    newBody = Buffer.concat(children(body, 0, body.length)
        .map((c) => rebuild(body, c)));
  } else {
    return b.subarray(box.start, box.start + box.size);
  }
  const hdr = Buffer.alloc(8);
  hdr.writeUInt32BE(8 + newBody.length, 0); hdr.write(box.type, 4, "latin1");
  return Buffer.concat([hdr, newBody]);
}

const top = children(buf, 0, buf.length);
const moovIdx = top.findIndex((x) => x.type === "moov");
const mdatIdx = top.findIndex((x) => x.type === "mdat");
if (moovIdx < 0 || mdatIdx < 0 || moovIdx < mdatIdx) {
  throw new Error("need moov after mdat");
}
writeFileSync(outp, Buffer.concat(top.map((x) => rebuild(buf, x))));
