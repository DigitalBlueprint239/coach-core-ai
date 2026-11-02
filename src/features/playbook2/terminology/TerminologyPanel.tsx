import React from 'react';
import type { TeamPlaybookSettings } from '../playModel';

export type TerminologyPanelProps = { settings: TeamPlaybookSettings; onChange(s: TeamPlaybookSettings): void };

export const TerminologyPanel: React.FC<TerminologyPanelProps> = () => <section aria-label="Terminology" />;
