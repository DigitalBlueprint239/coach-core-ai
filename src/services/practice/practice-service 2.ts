import { PracticePlan } from '../../components/PracticePlanner/ModernPracticePlanner';

export interface PracticeServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

class PracticeService {
  private storageKey = 'coach-core-practice-plans';
  private plans: PracticePlan[] = [];

  constructor() {
    this.loadPlansFromStorage();
  }

  private loadPlansFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.plans = JSON.parse(stored).map((plan: any) => ({
          ...plan,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(plan.updatedAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load plans from storage:', error);
      this.plans = [];
    }
  }

  private savePlansToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.plans));
    } catch (error) {
      console.error('Failed to save plans to storage:', error);
      throw new Error('Failed to save practice plan');
    }
  }

  async savePracticePlan(plan: PracticePlan): Promise<PracticeServiceResponse> {
    try {
      const existingIndex = this.plans.findIndex(p => p.id === plan.id);

      if (existingIndex >= 0) {
        // Update existing plan
        this.plans[existingIndex] = {
          ...plan,
          updatedAt: new Date(),
        };
      } else {
        // Create new plan
        const newPlan = {
          ...plan,
          id: this.generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.plans.push(newPlan);
      }

      this.savePlansToStorage();

      return {
        success: true,
        message: 'Practice plan saved successfully',
        data: plan,
      };
    } catch (error) {
      console.error('Failed to save practice plan:', error);
      return {
        success: false,
        message: 'Failed to save practice plan',
      };
    }
  }

  async getPracticePlans(): Promise<PracticeServiceResponse> {
    try {
      return {
        success: true,
        message: 'Practice plans retrieved successfully',
        data: this.plans,
      };
    } catch (error) {
      console.error('Failed to get practice plans:', error);
      return {
        success: false,
        message: 'Failed to retrieve practice plans',
      };
    }
  }

  async getPracticePlanById(id: string): Promise<PracticeServiceResponse> {
    try {
      const plan = this.plans.find(p => p.id === id);

      if (!plan) {
        return {
          success: false,
          message: 'Practice plan not found',
        };
      }

      return {
        success: true,
        message: 'Practice plan retrieved successfully',
        data: plan,
      };
    } catch (error) {
      console.error('Failed to get practice plan:', error);
      return {
        success: false,
        message: 'Failed to retrieve practice plan',
      };
    }
  }

  async deletePracticePlan(id: string): Promise<PracticeServiceResponse> {
    try {
      const index = this.plans.findIndex(p => p.id === id);

      if (index === -1) {
        return {
          success: false,
          message: 'Practice plan not found',
        };
      }

      this.plans.splice(index, 1);
      this.savePlansToStorage();

      return {
        success: true,
        message: 'Practice plan deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete practice plan:', error);
      return {
        success: false,
        message: 'Failed to delete practice plan',
      };
    }
  }

  async sharePracticePlan(
    id: string,
    recipients: string[]
  ): Promise<PracticeServiceResponse> {
    try {
      const plan = this.plans.find(p => p.id === id);

      if (!plan) {
        return {
          success: false,
          message: 'Practice plan not found',
        };
      }

      // In a real application, this would send the plan via email, messaging, etc.
      // For now, we'll simulate sharing by logging the action
      console.log(`Sharing practice plan "${plan.title}" with:`, recipients);

      return {
        success: true,
        message: `Practice plan shared with ${recipients.length} recipient(s)`,
        data: { planId: id, recipients },
      };
    } catch (error) {
      console.error('Failed to share practice plan:', error);
      return {
        success: false,
        message: 'Failed to share practice plan',
      };
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export plans to different formats
  async exportPracticePlan(
    id: string,
    format: 'json' | 'pdf' | 'csv'
  ): Promise<PracticeServiceResponse> {
    try {
      const plan = this.plans.find(p => p.id === id);

      if (!plan) {
        return {
          success: false,
          message: 'Practice plan not found',
        };
      }

      let exportData: any;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(plan, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(plan);
          break;
        case 'pdf':
          // In a real application, this would generate a PDF
          exportData = `PDF generation for "${plan.title}" - Feature coming soon`;
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        success: true,
        message: `Practice plan exported as ${format.toUpperCase()}`,
        data: { format, data: exportData },
      };
    } catch (error) {
      console.error('Failed to export practice plan:', error);
      return {
        success: false,
        message: 'Failed to export practice plan',
      };
    }
  }

  private convertToCSV(plan: PracticePlan): string {
    const headers = ['Period', 'Duration', 'Drills', 'Notes'];
    const rows = plan.periods.map(period => [
      period.name,
      `${period.duration} min`,
      period.drills.map(drill => drill.name).join('; '),
      period.notes,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}

export default PracticeService;
