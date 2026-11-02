// The step-through read (spec §5.3): numbered steps under the sheet that match the ①②③ badges on it.
// A real sequence, so numbers are right here. Arrow keys move between steps (roving focus).
import React, { useRef } from 'react';
import { applyTerminology } from '../../../football-core';
import type { ReadStep, Terminology } from '../../../football-core';

export type ReadStepsProps = { steps: ReadStep[]; terminology: Terminology; active: number; onSelect(index: number): void };

export const ReadSteps: React.FC<ReadStepsProps> = ({ steps, terminology, active, onSelect }) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const go = (i: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, i));
    onSelect(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const moves: Record<string, number> = {
      ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: steps.length - 1,
    };
    if (e.key in moves) {
      e.preventDefault();
      go(moves[e.key]);
    }
  };

  return (
    <ol className="pb2-steps" aria-label="The read, step by step">
      {steps.map((s, i) => (
        <li key={i} className="pb2-step-item">
          <button
            ref={el => {
              refs.current[i] = el;
            }}
            type="button"
            className="pb2-step"
            aria-current={i === active ? 'step' : undefined}
            tabIndex={i === active ? 0 : -1}
            onClick={() => onSelect(i)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            <span className="pb2-step-num">
              {i + 1}
            </span>
            <span className="pb2-step-text">{applyTerminology(s.text, terminology)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
};
