"use strict";
/**
 * FILM-S2b object adapter (Cloud Storage), worker-owned. The S1 adapter
 * (storage-adapter.js) is frozen and folds 404 and 412 together; the worker
 * must record them distinctly (statement r2: a 404 is recorded as absent, a
 * 412 preserves the object and records a mismatch).
 *
 * Every read and delete names ONE exact generation. Uploads are create-only
 * (ifGenerationMatch: 0). Generations are decimal strings.
 */

const code = (e) => (e && (e.code || (e.response && e.response.status)));

/**
 * @param {object} bucket @google-cloud/storage Bucket
 * @return {object} adapter
 */
function createObjectStore(bucket) {
  return {
    /**
     * Download one exact generation to a local file.
     * @param {{name: string, generation: string, dest: string}} t
     * @return {Promise<boolean>} false when that generation is gone (404)
     */
    async downloadGeneration({name, generation, dest}) {
      if (!generation) throw new Error("generation required");
      try {
        await bucket.file(name, {generation}).download(
            {destination: dest, validation: false});
        return true;
      } catch (e) {
        if (code(e) === 404) return false;
        throw e;
      }
    },

    /**
     * Read one exact generation fully.
     * @param {{name: string, generation: string}} t
     * @return {Promise<?Buffer>}
     */
    async readGeneration({name, generation}) {
      try {
        const [buf] = await bucket.file(name, {generation})
            .download({validation: false});
        return buf;
      } catch (e) {
        if (code(e) === 404) return null;
        throw e;
      }
    },

    /**
     * Live object at a name (any generation).
     * @param {{name: string}} t
     * @return {Promise<?{generation: string, size: number,
     *   metadata: object}>}
     */
    async stat({name}) {
      try {
        const [md] = await bucket.file(name).getMetadata();
        return {generation: String(md.generation), size: Number(md.size),
          metadata: {...(md.metadata || {})}};
      } catch (e) {
        if (code(e) === 404) return null;
        throw e;
      }
    },

    /**
     * Create-only upload.
     * @param {{name: string, file: string, contentType: string,
     *   metadata: object}} t
     * @return {Promise<{generation: string}>} throws {code: 412} when an
     *   object already exists at the name; other errors are ambiguous
     */
    async createOnly({name, file, contentType, metadata}) {
      const [f] = await bucket.upload(file, {
        destination: name, resumable: false, validation: "crc32c",
        preconditionOpts: {ifGenerationMatch: 0},
        metadata: {contentType, metadata},
      });
      return {generation: String(f.metadata.generation)};
    },

    /**
     * Delete exactly one generation.
     * @param {{name: string, generation: string}} t
     * @return {Promise<"deleted"|"absent"|"mismatch">}
     */
    async deleteGeneration({name, generation}) {
      if (!generation) throw new Error("generation required");
      try {
        await bucket.file(name).delete({ifGenerationMatch: generation});
        return "deleted";
      } catch (e) {
        if (code(e) === 404) return "absent";
        if (code(e) === 412) return "mismatch";
        throw e;
      }
    },
  };
}

module.exports = {createObjectStore};
