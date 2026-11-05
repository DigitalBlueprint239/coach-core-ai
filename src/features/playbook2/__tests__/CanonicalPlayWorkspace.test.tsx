import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fullLibrary, type PlayDocV3 } from '../../../football-core';
import { newBlankPlay } from '../playModel';
import { CanonicalPlayWorkspace } from '../canonical/CanonicalPlayWorkspace';
import { makeCanonicalDraft } from '../canonical/canonicalProjection';
import { loadPlayDocsV3, savePlayDocV3 } from '../playStoreV3';

vi.mock('../playStoreV3', () => ({
  loadPlayDocsV3: vi.fn(async () => ({ plays: [], skipped: 0 })),
  savePlayDocV3: vi.fn(async () => ({ id: 'new-v3', revision: 1 })),
  isPlayConflict: (e: unknown) => typeof e === 'object' && e !== null && 'kind' in e && (e as { kind: unknown }).kind === 'conflict',
}));

const formation = fullLibrary().formations[0];
const seed = (id?: string) => ({ ...newBlankPlay('t1', formation), ...(id ? { id } : {}), name: 'Original' });
const document = (id: string, revision: number, sourceSchemaVersion: 2 | 3 = 3) => ({
  ...makeCanonicalDraft(seed()),
  id,
  sourceSchemaVersion,
  revision,
  name: 'Stored Play',
});
const mount = (source?: ReturnType<typeof seed>) =>
  render(<CanonicalPlayWorkspace teamId="t1" uid="coach1" terminology={{}} seed={source} onClose={vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadPlayDocsV3).mockResolvedValue({ plays: [], skipped: 0 });
  vi.mocked(savePlayDocV3).mockResolvedValue({ id: 'new-v3', revision: 1 });
});

describe('canonical v3 workspace', () => {
  it('saves an existing v2 play as a NEW canonical document with its source ID', async () => {
    mount(seed('old-v2'));
    expect(screen.getByText(/Original v2 is read-only/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save new v3 copy' }));
    await waitFor(() => expect(savePlayDocV3).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 3, status: 'draft', provenance: { origin: 'migrated', fromSchemaVersion: 2, sourceId: 'old-v2' } }),
      'coach1',
      {},
    ));
    expect(screen.getByText(/Saved v3 draft/)).toBeInTheDocument();
  });
  it('opens and updates a real v3 record with its exact optimistic revision', async () => {
    vi.mocked(loadPlayDocsV3).mockResolvedValue({ plays: [document('v3-17', 4)], skipped: 0 });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Open Stored Play' }));
    const field = screen.getByRole('textbox', { name: 'Canonical play name' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save v3 revision' }));
    await waitFor(() => expect(savePlayDocV3).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated', revision: 4 }),
      'coach1',
      { id: 'v3-17', expectedRevision: 4 },
    ));
    expect(screen.getByText(/Revision 1\./)).toBeInTheDocument();
  });
  it('does not silently rewrite v2 documents selected from the library', async () => {
    vi.mocked(loadPlayDocsV3).mockResolvedValue({
      plays: [{
        ...document('v2-old', 1, 2),
        provenance: { origin: 'migrated', fromSchemaVersion: 2, sourceId: 'v2-old' },
      }],
      skipped: 0,
    });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Open Stored Play' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save new v3 copy' }));
    await waitFor(() => expect(savePlayDocV3).toHaveBeenCalledWith(
      expect.objectContaining({ provenance: { origin: 'migrated', fromSchemaVersion: 2, sourceId: 'v2-old' } }),
      'coach1',
      {},
    ));
  });
  it('preserves non-displayable typed v3 assignments unchanged on edit and save', async () => {
    const record = document('v3-run', 2);
    record.assignments = [{ kind: 'run-track', slot: 'back', track: { aimingPoint: 'B-gap', side: 'weak' } }] as PlayDocV3['assignments'];
    vi.mocked(loadPlayDocsV3).mockResolvedValue({ plays: [record], skipped: 0 });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Open Stored Play' }));
    expect(screen.getByText(/1 specialized v3 assignments are preserved/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Canonical coaching notes' }), ' Coach insight');
    await userEvent.click(screen.getByRole('button', { name: 'Save v3 revision' }));
    await waitFor(() => expect(savePlayDocV3).toHaveBeenCalledWith(
      expect.objectContaining({ assignments: record.assignments }),
      'coach1',
      { id: 'v3-run', expectedRevision: 2 },
    ));
  });
  it('on conflict leaves edits intact and offers a non-destructive separate draft', async () => {
    vi.mocked(loadPlayDocsV3).mockResolvedValue({ plays: [document('v3-17', 1)], skipped: 0 });
    vi.mocked(savePlayDocV3).mockRejectedValueOnce({
      kind: 'conflict', storedRevision: 3, message: 'The saved revision changed. Your edits are still here.',
    });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Open Stored Play' }));
    const name = screen.getByRole('textbox', { name: 'Canonical play name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'My unsaved change');
    await userEvent.click(screen.getByRole('button', { name: 'Save v3 revision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your edits are still here');
    expect(name).toHaveValue('My unsaved change');
    await userEvent.click(screen.getByRole('button', { name: 'Save as separate draft instead' }));
    expect(name).toHaveValue('My unsaved change (copy)');
    await userEvent.click(screen.getByRole('button', { name: 'Save new v3 copy' }));
    await waitFor(() => expect(savePlayDocV3).toHaveBeenLastCalledWith(
      expect.objectContaining({ provenance: { origin: 'created' }, name: 'My unsaved change (copy)' }),
      'coach1',
      {},
    ));
  });
  it('published v3 records are read-only until explicitly copied', async () => {
    vi.mocked(loadPlayDocsV3).mockResolvedValue({
      plays: [{ ...document('v3-published', 3), status: 'published' }],
      skipped: 0,
    });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Open Stored Play' }));
    expect(screen.getByRole('button', { name: 'Save v3 revision' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Canonical play name' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save as separate draft instead' }));
    expect(screen.getByRole('textbox', { name: 'Canonical play name' })).toBeEnabled();
  });
});
