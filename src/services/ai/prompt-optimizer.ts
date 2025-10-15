export interface PromptOptimizationRequest {
  originalPrompt: string;
  targetModel: string;
  context?: string;
  desiredOutcome?: string;
  constraints?: string[];
  examples?: string[];
}

export interface PromptOptimizationResult {
  optimizedPrompt: string;
  suggestions: string[];
  model: string;
  approximateTokens: number;
}

class PromptOptimizer {
  async optimizePrompt(
    request: PromptOptimizationRequest
  ): Promise<PromptOptimizationResult> {
    const {
      originalPrompt,
      targetModel,
      context,
      desiredOutcome,
      constraints = [],
      examples = [],
    } = request;

    const trimmed = originalPrompt.trim();

    const header: string[] = [];
    if (context) {
      header.push(`Context:\n${context.trim()}`);
    }
    if (desiredOutcome) {
      header.push(`Goal:\n${desiredOutcome.trim()}`);
    }
    if (constraints.length > 0) {
      header.push(`Constraints:\n- ${constraints.join('\n- ')}`);
    }
    if (examples.length > 0) {
      header.push(`Examples:\n${examples.join('\n')}`);
    }

    const structureHint = this.buildStructureHint(trimmed);

    const optimizedPrompt = [
      header.join('\n\n'),
      trimmed,
      structureHint,
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const suggestions = this.buildSuggestions(trimmed, structureHint !== '');

    return {
      optimizedPrompt,
      suggestions,
      model: targetModel,
      approximateTokens: this.estimateTokens(optimizedPrompt),
    };
  }

  private buildStructureHint(prompt: string): string {
    const normalized = prompt.toLowerCase();
    if (normalized.includes('json')) {
      return '';
    }

    return [
      'Please respond with a structured JSON payload that includes:',
      '- "summary" (string)',
      '- "key_points" (array of strings)',
      '- "actions" (array of strings)',
    ].join('\n');
  }

  private buildSuggestions(prompt: string, addedStructure: boolean): string[] {
    const suggestions: string[] = [];

    if (!prompt.includes('You are')) {
      suggestions.push('Define assistant role at the top (e.g. "You are an elite coach...").');
    }

    if (addedStructure) {
      suggestions.push('Explicit JSON contract added for consistent downstream parsing.');
    }

    if (!prompt.includes('Constraints')) {
      suggestions.push('Outline constraints or guardrails to limit irrelevant responses.');
    }

    return suggestions;
  }

  private estimateTokens(content: string): number {
    const words = content.split(/\s+/).filter(Boolean).length;
    return Math.max(32, Math.round(words * 1.5));
  }
}

export const promptOptimizer = new PromptOptimizer();
export default promptOptimizer;
