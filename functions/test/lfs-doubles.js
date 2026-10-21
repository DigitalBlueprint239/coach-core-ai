"use strict";
// LFS test doubles, layered on the accepted C1 doubles (unchanged): a bucket
// that also LISTS like the JSON API (lexicographic by name, inclusive
// startOffset, maxResults) and records object metadata (size string,
// contentType, timeCreated). Test-only; no network.
const {FakeBucket, FakeFirestore, FakeTimestamp} =
  require("./film-cleanup-doubles");

/** Bucket double with listing. */
class LfsBucket extends FakeBucket {
  /** @param {string} name @param {function(): Date} now */
  constructor(name, now) {
    super(name);
    this.now = now;
    this.meta = new Map(); // name -> {contentType, timeCreated}
    this.lists = [];
    /** Optional: async (query, items) -> items|throw. */
    this.listFault = null;
    /** Optional: async ({name, generation}) before a download. */
    this.downloadFault = null;
    /** Optional: max items per page (GCS may return SHORT pages). */
    this.pageCap = null;
  }
  /**
   * @param {string} name
   * @param {Buffer} bytes
   * @param {string} [contentType]
   * @param {string} [generation]
   * @param {{timeCreated: string}} [o]
   * @return {object} finalize event
   */
  put(name, bytes, contentType = "video/mp4", generation, o = {}) {
    const e = super.put(name, bytes, contentType, generation);
    this.meta.set(name, {contentType, timeCreated: o.timeCreated ||
      this.now().toISOString()});
    return e;
  }
  /**
   * @param {string} name
   * @param {object} [fo]
   * @return {object}
   */
  file(name, fo = {}) {
    const f = super.file(name, fo);
    const download = f.download;
    f.download = async (d) => {
      if (this.downloadFault) {
        await this.downloadFault({name, generation: fo.generation});
      }
      return download(d);
    };
    return f;
  }
  /**
   * @param {{prefix: string, startOffset: string, pageToken: string,
   *   maxResults: number}} q
   * @return {Promise<{items: object[], nextPageToken: ?string}>}
   */
  async listObjects(q) {
    this.lists.push({...q});
    let items = [...this.objects.entries()]
        .filter(([n]) => n.startsWith(q.prefix) &&
          (!q.startOffset || n >= q.startOffset))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([n, o]) => ({name: n, generation: o.generation,
          size: String(o.bytes.length),
          contentType: (this.meta.get(n) || {}).contentType,
          timeCreated: (this.meta.get(n) || {}).timeCreated,
          metageneration: "1"}));
    // pageToken: like GCS, an opaque resume point AFTER the last name
    // returned for the SAME query (stays correct across deletions)
    if (q.pageToken) {
      const m = /^tok:(.+)$/.exec(q.pageToken);
      if (!m) throw Object.assign(new Error("invalid token"), {code: 400});
      const after = Buffer.from(m[1], "base64url").toString();
      items = items.filter((it) => it.name > after);
    }
    const n = Math.min(q.maxResults, this.pageCap || q.maxResults);
    const more = items.length > n;
    items = items.slice(0, n);
    let token = more ? `tok:${Buffer.from(items[n - 1].name)
        .toString("base64url")}` : null;
    if (this.listFault) {
      const r = await this.listFault(q, items, token);
      if (Array.isArray(r)) items = r;
      else ({items, token} = r);
    }
    return {items, nextPageToken: token};
  }
}

module.exports = {LfsBucket, FakeFirestore, FakeTimestamp};
