import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { draftQueue, fullLibrary, type ContentDecision } from '../../../football-core';
import ContentReview from '../review/ContentReview';

const queue = draftQueue(fullLibrary());
const item = (name: string) => screen.getByRole('heading', { name }).closest('article')!;

describe('ContentReview', () => {
  it('lists every draft with its note and sources', () => {
    render(<ContentReview reviewer="Owner" />);
    expect(screen.getAllByRole('article')).toHaveLength(queue.length);
    for (const d of queue) {
      const card = item(d.name);
      expect(card).toHaveTextContent(d.verification.note);
      for (const s of d.verification.sources) {
        expect(within(card).getByRole('link', { name: new RegExp(s.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toHaveAttribute('href', s.url);
      }
    }
  });

  it('shows a diagram for formations and concepts and the claim for matchups', () => {
    render(<ContentReview reviewer="Owner" />);
    expect(within(item('Empty')).getByRole('img')).toBeInTheDocument();
    expect(within(item('Flood')).getByRole('img')).toBeInTheDocument();
    const matchup = queue.find(d => d.kind === 'matchup' && d.id === 'flood:cover-3')!;
    const claim = fullLibrary().matchups.find(m => m.concept === 'flood' && m.beats === 'cover-3')!.reason;
    expect(item(matchup.name)).toHaveTextContent(claim);
  });

  it('approve records a decision and takes the item out of the queue', async () => {
    render(<ContentReview reviewer="Owner" />);
    await userEvent.click(within(item('Flood')).getByRole('button', { name: 'Approve' }));
    expect(screen.queryByRole('heading', { name: 'Flood' })).not.toBeInTheDocument();
    const log = screen.getByRole('list', { name: 'Decisions this session' });
    expect(log).toHaveTextContent(/Approved.*Flood/);
  });

  it('rejecting requires a reason', async () => {
    render(<ContentReview reviewer="Owner" />);
    await userEvent.click(within(item('Snag')).getByRole('button', { name: 'Reject' }));
    const confirm = within(item('Snag')).getByRole('button', { name: 'Confirm reject' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(item('Snag')).getByRole('textbox', { name: 'Reason for rejecting' }), 'Not taught this way');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(screen.queryByRole('heading', { name: 'Snag' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Decisions this session' })).toHaveTextContent(/Rejected.*Snag.*Not taught this way/);
  });

  it('Download decisions produces JSON with the existing and new decisions', async () => {
    const existing: ContentDecision[] = [
      { kind: 'concept', id: 'mesh', decision: 'reject', reviewer: 'Owner', date: '2026-10-31', reason: 'Wrong routes' },
    ];
    const onDownload = vi.fn();
    render(<ContentReview reviewer="Coach Kim" existing={existing} onDownload={onDownload} />);
    expect(screen.getByRole('button', { name: 'Download decisions' })).toBeDisabled();
    await userEvent.click(within(item('Flood')).getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Download decisions' }));
    const json = JSON.parse(onDownload.mock.calls[0][0] as string);
    expect(json.decisions).toHaveLength(2);
    expect(json.decisions[0]).toEqual(existing[0]);
    expect(json.decisions[1]).toMatchObject({ kind: 'concept', id: 'flood', decision: 'approve', reviewer: 'Coach Kim' });
    expect(json.decisions[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('says so when the queue is empty', () => {
    render(<ContentReview reviewer="Owner" queue={[]} />);
    expect(screen.getByText('Nothing waiting for review.')).toBeInTheDocument();
  });
});
