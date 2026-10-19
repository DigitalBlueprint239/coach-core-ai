"use strict";
/**
 * Thin Cloud Storage adapter used by the film handlers. Kept separate so the
 * handlers are testable with fakes and so every real delete in this slice
 * goes through one generation-aware function.
 */

/**
 * @param {object} bucket @google-cloud/storage Bucket
 * @return {{deleteObject: function, readHead: function}}
 */
function createStorageAdapter(bucket) {
  return {
    /**
     * Delete exactly one object. When `generation` is given the delete is
     * conditional on that generation, so a newer upload at the same name is
     * never removed by a stale cleanup.
     * @param {object} target {name, generation?}
     * @return {Promise<boolean>} true when something was deleted
     */
    async deleteObject({name, generation}) {
      const opts = {};
      if (generation) opts.ifGenerationMatch = Number(generation);
      try {
        await bucket.file(name).delete(opts);
        return true;
      } catch (e) {
        const code = e && e.code;
        // 404: already gone. 412: a different generation now lives there and
        // must be left alone.
        if (code === 404 || code === 412) return false;
        throw e;
      }
    },

    /**
     * Read the first `bytes` of one exact generation.
     * @param {object} target {name, generation, bytes}
     * @return {Promise<Buffer|null>} null when that generation is gone
     */
    async readHead({name, generation, bytes}) {
      const file = bucket.file(name, {generation: Number(generation)});
      try {
        const [buf] = await file.download({start: 0, end: bytes - 1});
        return buf;
      } catch (e) {
        if (e && e.code === 404) return null;
        throw e;
      }
    },
  };
}

module.exports = {createStorageAdapter};
