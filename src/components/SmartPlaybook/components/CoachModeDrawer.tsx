/**
 * CoachModeDrawer — Full CCIL diagnostics panel
 *
 * Slides in from the right as an overlay drawer.
 * Shows the complete analysis result: all issues grouped by category,
 * the canonical play summary, and the score breakdown.
 * Desktop only — hidden on mobile viewports.
 */

import React from 'react';
import type { AnalysisResult, IntelligenceIssue, IssueCategory } from '../ccil/types';

interface CoachModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult;
  revision: number;
  playerCount: number;
  routeCount: number;
}

const SEVERITY_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-800' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  info: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  alignment: 'Alignment',
  spacing: 'Spacing',
  route_conflict: 'Route Conflicts',
  coverage_gap: 'Coverage Gaps',
  personnel: 'Personnel',
  formation: 'Formation',
  general: 'General',
};

function groupByCategory(issues: IntelligenceIssue[]): Map<IssueCategory, IntelligenceIssue[]> {
  const groups = new Map<IssueCategory, IntelligenceIssue[]>();
  for (const issue of issues) {
    const list = groups.get(issue.category) ?? [];
    list.push(issue);
    groups.set(issue.category, list);
  }
  return groups;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = '#22c55e'; // green
  if (score < 50) strokeColor = '#ef4444'; // red
  else if (score < 80) strokeColor = '#eab308'; // yellow

  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span
        className="text-2xl font-bold -mt-14"
        style={{ color: strokeColor }}
      >
        {score}
      </span>
      <span className="text-xs text-gray-500 mt-6">Play Quality</span>
    </div>
  );
}

function IssueCard({ issue }: { issue: IntelligenceIssue }) {
  const badge = SEVERITY_BADGE[issue.severity] ?? SEVERITY_BADGE.info;
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
          {issue.severity}
        </span>
        <span className="text-sm font-medium text-gray-800">{issue.title}</span>
      </div>
      <p className="text-xs text-gray-600">{issue.description}</p>
      {issue.suggestion && (
        <p className="text-xs text-indigo-600 italic">{issue.suggestion}</p>
      )}
      {issue.affectedPlayerIds.length > 0 && (
        <p className="text-xs text-gray-400">
          Affects: {issue.affectedPlayerIds.length} player(s)
        </p>
      )}
    </div>
  );
}

export default function CoachModeDrawer({
  isOpen,
  onClose,
  analysisResult,
  revision,
  playerCount,
  routeCount,
}: CoachModeDrawerProps) {
  const { issues, score, analyzedAt } = analysisResult;
  const grouped = groupByCategory(issues);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 hidden lg:block"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 hidden lg:flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Coach Mode</h2>
            <p className="text-xs text-gray-500">
              Revision {revision} &middot; {new Date(analyzedAt).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Close Coach Mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Score ring */}
          <div className="flex justify-center">
            <ScoreRing score={score} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-800">{playerCount}</p>
              <p className="text-xs text-gray-500">Players</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-800">{routeCount}</p>
              <p className="text-xs text-gray-500">Routes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-800">{issues.length}</p>
              <p className="text-xs text-gray-500">Issues</p>
            </div>
          </div>

          {/* Issues grouped by category */}
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No issues found.</p>
              <p className="text-xs text-gray-300 mt-1">Your play design looks clean.</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, categoryIssues]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category] ?? category} ({categoryIssues.length})
                </h3>
                <div className="space-y-2">
                  {categoryIssues.map(issue => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
