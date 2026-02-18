/**
 * AssistModePanel — Minimal CCIL surface for the right sidebar
 *
 * Shows a compact score badge + top issues summary.
 * Designed to sit above PlayLibrary in the right column without
 * overwhelming the playbook workspace.
 */

import React from 'react';
import type { AnalysisResult, IntelligenceIssue } from '../ccil/types';

interface AssistModePanelProps {
  analysisResult: AnalysisResult;
  revision: number;
  onOpenCoachMode: () => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-400' },
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 50) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function IssueRow({ issue }: { issue: IntelligenceIssue }) {
  const style = SEVERITY_STYLES[issue.severity] ?? SEVERITY_STYLES.info;
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded ${style.bg}`}>
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
      <div className="min-w-0">
        <p className={`text-xs font-medium ${style.text} truncate`}>{issue.title}</p>
        <p className="text-xs text-gray-500 truncate">{issue.description}</p>
      </div>
    </div>
  );
}

const MAX_VISIBLE_ISSUES = 3;

export default function AssistModePanel({
  analysisResult,
  revision,
  onOpenCoachMode,
}: AssistModePanelProps) {
  const { issues, score } = analysisResult;
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  // Show top issues sorted by severity
  const priorityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const sorted = [...issues].sort(
    (a, b) => (priorityOrder[a.severity] ?? 9) - (priorityOrder[b.severity] ?? 9)
  );
  const visible = sorted.slice(0, MAX_VISIBLE_ISSUES);
  const hiddenCount = issues.length - visible.length;

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Assist Mode</h3>
        <span className="text-xs text-gray-400">rev {revision}</span>
      </div>

      {/* Score badge */}
      <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${scoreBg(score)}`}>
        <span className="text-xs font-medium text-gray-600">Play Score</span>
        <span className={`text-lg font-bold ${scoreColor(score)}`}>{score}</span>
      </div>

      {/* Severity summary chips */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              {warningCount} warning
            </span>
          )}
        </div>
      )}

      {/* Top issues */}
      {visible.length > 0 && (
        <div className="space-y-1.5">
          {visible.map(issue => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {issues.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          No issues detected. Looking good!
        </p>
      )}

      {/* Coach Mode trigger */}
      <button
        onClick={onOpenCoachMode}
        className="w-full mt-1 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        {hiddenCount > 0
          ? `Open Coach Mode (+${hiddenCount} more)`
          : 'Open Coach Mode'}
      </button>
    </div>
  );
}
