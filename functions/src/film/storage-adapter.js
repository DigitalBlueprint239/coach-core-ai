"use strict";
/**
 * Generation-aware Cloud Storage adapter for the film handlers (R2/R3).
 * Every film delete and head read targets ONE exact object generation.
 * Lifted from the reference branch claude/film-s1-backend-b @ d052244, with
 * generations kept as decimal strings (no Number() precision loss).
 */

/**
 * @param {object} bucket @google-cloud/storage Bucket
 * @return {{deleteObject: function, readHead: function}}
 */
function createStorageAdapter(bucket) {
  return {
    /**
     * Delete exactly one generation.
     * @param {{name: string, generation: string}} target
     * @return {Promise<boolean>} true when that generation was deleted;
     *   false when it was already gone (404) or replaced (412)
     */
    async deleteObject({name, generation}) {
      if (!generation) throw new Error("generation required");
      try {
        await bucket.file(name).delete({ifGenerationMatch: generation});
        return true;
      } catch (e) {
        const code = e && e.code;
        if (code === 404 || code === 412) return false;
        throw e;
      }
    },

    /**
     * Read the first `bytes` of one exact generation.
     * @param {{name: string, generation: string, bytes: number}} target
     * @return {Promise<?Buffer>} null when that generation no longer exists;
     *   throws on any other (possibly transient) error
     */
    async readHead({name, generation, bytes}) {
      const file = bucket.file(name, {generation});
      try {
        const [buf] = await file.download(
            {start: 0, end: bytes - 1, validation: false});
        return buf;
      } catch (e) {
        if (e && e.code === 404) return null;
        throw e;
      }
    },
  };
}

module.exports = {createStorageAdapter};
