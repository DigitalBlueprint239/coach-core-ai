"use strict";
/**
 * FILM-S2b trigger DEFINITION (test-only). It is deliberately NOT exported
 * from functions/index.js; the predeploy guard and a wiring test enforce
 * that while the designation is TEST_ONLY. Platform retry is OFF: an event
 * is delivered at least once and never redelivered on failure; further
 * attempts come only from an explicit synthetic redrive (statement r2).
 */
const {onDocumentWritten} = require("firebase-functions/v2/firestore");

const WORKER_TRIGGER_DOCUMENT = "teams/{teamId}/films/{filmId}";

/**
 * @param {{onFilmWritten: function(object): Promise<object>}} worker
 * @return {function} the (unexported) trigger
 */
function defineWorkerTrigger(worker) {
  return onDocumentWritten({document: WORKER_TRIGGER_DOCUMENT, retry: false},
      (event) => worker.onFilmWritten(event));
}

module.exports = {defineWorkerTrigger, WORKER_TRIGGER_DOCUMENT};
