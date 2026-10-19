"use strict";
/**
 * coach-film.v1 — limits and fixed values (single source of truth).
 *
 * TEST PLACEHOLDERS. Values tagged PENDING_D3 / PENDING_D7 are copied from
 * the Founder Decision Packet *recommendations*. They are NOT approved terms.
 * The settled D3 / D7 record has not been attached (reconciliation §6,
 * G3 / G7). When it is, change the values here only; the rules literals are
 * checked against this module by a static test (FS-25).
 *
 * Values tagged DELEGATED are engineering choices agreed between Claude and
 * Codex (reconciliation §2), not owner decisions.
 */

const PLACEHOLDER_STATUS = "TEST_PLACEHOLDER_NOT_APPROVED";

const LIMITS = Object.freeze({
  // PENDING_D3 (G3). Packet: 100,000,000 bytes. Spec says 100 MiB; the unit
  // conflict is open. Decimal bytes used until the settled term says otherwise.
  maxBytes: 100000000,
  // PENDING_D3. Enforced by the decoder slice, not FILM-S1. Published only.
  maxDurationMs: 300000,
  maxWidth: 1920,
  maxHeight: 1080,
  // PENDING_D3. Films per team that hold a cap slot (reserved, validating,
  // ready). Rejected, abandoned and expired films release their slot.
  teamFilmCap: 20,
  // PENDING_D3. Only MP4 container in FILM-S1; codec check is the decoder's.
  allowedContentTypes: Object.freeze(["video/mp4"]),
  // PENDING_D7 (G7). Rights wording versions the server accepts.
  acceptedRightsWordingVersions: Object.freeze(["rights-v1"]),
  // DELEGATED. Reservation lifetime before the upload must start.
  reservationLifetimeMs: 60 * 60 * 1000,
  // DELEGATED. Contract field bounds.
  maxFileNameLength: 120,
});

const PENDING = Object.freeze({
  maxBytes: "PENDING_D3",
  maxDurationMs: "PENDING_D3",
  maxWidth: "PENDING_D3",
  maxHeight: "PENDING_D3",
  teamFilmCap: "PENDING_D3",
  allowedContentTypes: "PENDING_D3",
  acceptedRightsWordingVersions: "PENDING_D7",
  reservationLifetimeMs: "DELEGATED",
  maxFileNameLength: "DELEGATED",
});

module.exports = {LIMITS, PENDING, PLACEHOLDER_STATUS};
