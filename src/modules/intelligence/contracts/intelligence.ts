export type DomainPhase = 'offense' | 'defense' | 'specialTeams';

export type IssueSeverity = 'info' | 'caution' | 'critical';

export interface IntelligenceIssue {
  id: string;
  severity: IssueSeverity;
  confidence: number;
  type: string;
  affectedEntities: string[];
  explanation: string;
  quickFixes: string[];
  coachOnlyDetails?: string;
}

export interface IntelligenceRecommendation {
  id: string;
  type: string;
  confidence: number;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
}

export interface IntelligenceScores {
  structuralScore: number;
  spacingScore: number;
  timingScore: number;
  integrityScore: number;
  [futureScore: string]: number;
}

export interface ConfidenceSummary {
  overall: number;
  highConfidenceDetections: number;
  mediumConfidenceDetections: number;
  lowConfidenceDetections: number;
}

export interface IntelligenceAnalysis<TDomain> {
  domainType: DomainPhase;
  detectedPatterns: string[];
  issues: IntelligenceIssue[];
  recommendations: IntelligenceRecommendation[];
  scores: IntelligenceScores;
  teachingPoints: string[];
  confidenceSummary: ConfidenceSummary;
  rawMetrics?: Record<string, unknown>;
  domain: TDomain;
}

export interface AssistModeIssue extends IntelligenceIssue {
  displayMode: 'full' | 'chip';
}

export interface AssistModeView<TDomain> {
  domainType: DomainPhase;
  detectedPatterns: string[];
  surfacedIssues: AssistModeIssue[];
  surfacedRecommendations: IntelligenceRecommendation[];
  oneClickFixes: string[];
  domain: TDomain;
}

export interface CoachModeView<TDomain> {
  domainType: DomainPhase;
  analysis: IntelligenceAnalysis<TDomain>;
}
