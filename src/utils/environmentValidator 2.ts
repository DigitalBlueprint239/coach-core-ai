/**
 * Environment Validation Utility
 * - Comprehensive environment variable validation
 * - Detailed error messages and suggestions
 * - Security checks and warnings
 * - Development vs production validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  environment: 'development' | 'staging' | 'production';
}

export interface ValidationError {
  variable: string;
  message: string;
  severity: 'critical' | 'error';
  suggestion?: string;
}

export interface ValidationWarning {
  variable: string;
  message: string;
  suggestion?: string;
}

export interface EnvironmentCheck {
  name: string;
  check: () => boolean | Promise<boolean>;
  errorMessage: string;
  suggestion?: string;
}

/**
 * Environment Validator Class
 */
export class EnvironmentValidator {
  private requiredVars: Record<string, string> = {
    // Firebase Configuration
    REACT_APP_FIREBASE_API_KEY:
      'Firebase API Key - Required for authentication and database access',
    REACT_APP_FIREBASE_AUTH_DOMAIN:
      'Firebase Auth Domain - Required for user authentication',
    REACT_APP_FIREBASE_PROJECT_ID:
      'Firebase Project ID - Required for database and storage access',
    REACT_APP_FIREBASE_STORAGE_BUCKET:
      'Firebase Storage Bucket - Required for file uploads',
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID:
      'Firebase Messaging Sender ID - Required for push notifications',
    REACT_APP_FIREBASE_APP_ID:
      'Firebase App ID - Required for app identification',

    // AI Services
    REACT_APP_OPENAI_API_KEY:
      'OpenAI API Key - Required for AI assistant features',
    REACT_APP_AI_PROXY_TOKEN:
      'AI Proxy Token - Required for secure AI service communication',
  };

  private optionalVars: Record<string, string> = {
    // Firebase (optional)
    REACT_APP_FIREBASE_MEASUREMENT_ID:
      'Firebase Measurement ID - Optional for analytics',

    // API Configuration
    REACT_APP_API_BASE_URL:
      'API Base URL - Optional, defaults to environment-specific URLs',
    REACT_APP_AI_SERVICE_URL:
      'AI Service URL - Optional, defaults to environment-specific URLs',

    // Monitoring
    REACT_APP_SENTRY_DSN: 'Sentry DSN - Optional for error tracking',

    // Features
    REACT_APP_ENABLE_AI_ASSISTANT:
      'Enable AI Assistant - Optional feature flag',
    REACT_APP_ENABLE_ANALYTICS: 'Enable Analytics - Optional feature flag',
    REACT_APP_ENABLE_PUSH_NOTIFICATIONS:
      'Enable Push Notifications - Optional feature flag',
    REACT_APP_ENABLE_OFFLINE_MODE:
      'Enable Offline Mode - Optional feature flag',
    REACT_APP_ENABLE_HUDL_INTEGRATION:
      'Enable Hudl Integration - Optional feature flag',
    REACT_APP_ENABLE_STRIPE_INTEGRATION:
      'Enable Stripe Integration - Optional feature flag',

    // Security
    REACT_APP_ENABLE_CSP:
      'Enable Content Security Policy - Optional security feature',
    REACT_APP_ENABLE_HSTS: 'Enable HSTS - Optional security feature',
    REACT_APP_ENABLE_2FA:
      'Enable Two-Factor Authentication - Optional security feature',

    // Development
    REACT_APP_USE_EMULATOR: 'Use Firebase Emulator - Optional for development',
    REACT_APP_ENABLE_DEBUG_MODE: 'Enable Debug Mode - Optional for development',
    REACT_APP_VAPID_KEY: 'VAPID Key - Optional for push notifications',
  };

  private securityChecks: EnvironmentCheck[] = [
    {
      name: 'Firebase API Key Format',
      check: () => {
        const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
        return apiKey ? apiKey.startsWith('AIza') : false;
      },
      errorMessage: 'Firebase API key format appears invalid',
      suggestion: 'Verify your Firebase API key in the Firebase Console',
    },
    {
      name: 'Firebase Project ID Format',
      check: () => {
        const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
        return projectId ? /^[a-z0-9-]+$/.test(projectId) : false;
      },
      errorMessage: 'Firebase project ID format is invalid',
      suggestion:
        'Project ID should contain only lowercase letters, numbers, and hyphens',
    },
    {
      name: 'OpenAI API Key Format',
      check: () => {
        const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
        return apiKey ? apiKey.startsWith('sk-') : false;
      },
      errorMessage: 'OpenAI API key format appears invalid',
      suggestion: 'Verify your OpenAI API key in the OpenAI dashboard',
    },
    {
      name: 'Environment Consistency',
      check: () => {
        const nodeEnv = process.env.NODE_ENV;
        const appEnv = process.env.REACT_APP_ENVIRONMENT;

        if (nodeEnv === 'production' && appEnv === 'development') {
          return false;
        }

        return true;
      },
      errorMessage: 'Environment configuration is inconsistent',
      suggestion: 'Ensure NODE_ENV and REACT_APP_ENVIRONMENT are properly set',
    },
  ];

  /**
   * Validate environment configuration
   */
  async validate(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Check required variables
    for (const [variable, description] of Object.entries(this.requiredVars)) {
      if (!process.env[variable]) {
        errors.push({
          variable,
          message: `Missing required environment variable: ${description}`,
          severity: 'critical',
          suggestion: `Add ${variable} to your .env file`,
        });
      }
    }

    // Check optional variables
    for (const [variable, description] of Object.entries(this.optionalVars)) {
      if (!process.env[variable]) {
        warnings.push({
          variable,
          message: `Missing optional environment variable: ${description}`,
          suggestion: `Consider adding ${variable} for enhanced functionality`,
        });
      }
    }

    // Run security checks
    for (const check of this.securityChecks) {
      try {
        const isValid = await check.check();
        if (!isValid) {
          errors.push({
            variable: check.name,
            message: check.errorMessage,
            severity: 'error',
            suggestion: check.suggestion,
          });
        }
      } catch (error) {
        errors.push({
          variable: check.name,
          message: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        });
      }
    }

    // Environment-specific checks
    const environmentChecks = this.getEnvironmentSpecificChecks();
    for (const check of environmentChecks) {
      try {
        const isValid = await check.check();
        if (!isValid) {
          errors.push({
            variable: check.name,
            message: check.errorMessage,
            severity: 'error',
            suggestion: check.suggestion,
          });
        }
      } catch (error) {
        errors.push({
          variable: check.name,
          message: `Environment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        });
      }
    }

    // Generate suggestions
    suggestions.push(...this.generateSuggestions(errors, warnings));

    const environment = this.determineEnvironment();

    return {
      isValid: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      suggestions,
      environment,
    };
  }

  /**
   * Get environment-specific validation checks
   */
  private getEnvironmentSpecificChecks(): EnvironmentCheck[] {
    const nodeEnv = process.env.NODE_ENV;
    const appEnv = process.env.REACT_APP_ENVIRONMENT;

    const checks: EnvironmentCheck[] = [];

    // Development environment checks
    if (nodeEnv === 'development') {
      checks.push({
        name: 'Development API URLs',
        check: () => {
          const apiUrl = process.env.REACT_APP_API_BASE_URL;
          const aiUrl = process.env.REACT_APP_AI_SERVICE_URL;

          if (apiUrl && !apiUrl.includes('localhost')) {
            return false;
          }
          if (aiUrl && !aiUrl.includes('localhost')) {
            return false;
          }

          return true;
        },
        errorMessage: 'Development environment should use localhost URLs',
        suggestion:
          'Use localhost URLs for development or set REACT_APP_ENVIRONMENT=staging',
      });
    }

    // Production environment checks
    if (nodeEnv === 'production' && appEnv === 'production') {
      checks.push({
        name: 'Production Security Features',
        check: () => {
          const csp = process.env.REACT_APP_ENABLE_CSP;
          const hsts = process.env.REACT_APP_ENABLE_HSTS;

          return csp === 'true' && hsts === 'true';
        },
        errorMessage: 'Production environment should enable security features',
        suggestion:
          'Set REACT_APP_ENABLE_CSP=true and REACT_APP_ENABLE_HSTS=true for production',
      });

      checks.push({
        name: 'Production API URLs',
        check: () => {
          const apiUrl = process.env.REACT_APP_API_BASE_URL;
          const aiUrl = process.env.REACT_APP_AI_SERVICE_URL;

          if (apiUrl && apiUrl.includes('localhost')) {
            return false;
          }
          if (aiUrl && aiUrl.includes('localhost')) {
            return false;
          }

          return true;
        },
        errorMessage: 'Production environment should not use localhost URLs',
        suggestion: 'Use production URLs for API and AI services',
      });
    }

    return checks;
  }

  /**
   * Generate suggestions based on errors and warnings
   */
  private generateSuggestions(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): string[] {
    const suggestions: string[] = [];

    // Firebase-related suggestions
    const firebaseErrors = errors.filter(e => e.variable.includes('FIREBASE'));
    if (firebaseErrors.length > 0) {
      suggestions.push(
        '📱 Firebase Setup: Visit https://console.firebase.google.com to create a project and get your configuration',
        '📋 Copy the Firebase config from Project Settings > General > Your Apps'
      );
    }

    // OpenAI-related suggestions
    const openaiErrors = errors.filter(e => e.variable.includes('OPENAI'));
    if (openaiErrors.length > 0) {
      suggestions.push(
        '🤖 OpenAI Setup: Visit https://platform.openai.com/api-keys to create an API key',
        '🔐 Keep your API key secure and never commit it to version control'
      );
    }

    // Development suggestions
    if (process.env.NODE_ENV === 'development') {
      suggestions.push(
        '🔧 Development Mode: Consider using Firebase emulators for local development',
        '📝 Create a .env.local file for local environment variables'
      );
    }

    // Production suggestions
    if (process.env.NODE_ENV === 'production') {
      suggestions.push(
        '🚀 Production Mode: Ensure all security features are enabled',
        '📊 Set up monitoring and analytics for production deployment',
        '🔒 Review and update security rules before deployment'
      );
    }

    // General suggestions
    if (warnings.length > 0) {
      suggestions.push(
        '⚙️ Optional Features: Consider enabling optional features for enhanced functionality',
        '📈 Analytics: Set up Sentry for error tracking in production'
      );
    }

    return suggestions;
  }

  /**
   * Determine current environment
   */
  private determineEnvironment(): 'development' | 'staging' | 'production' {
    const nodeEnv = process.env.NODE_ENV;
    const appEnv = process.env.REACT_APP_ENVIRONMENT;

    if (nodeEnv === 'production') {
      return appEnv === 'staging' ? 'staging' : 'production';
    }

    return 'development';
  }

  /**
   * Validate specific environment variable
   */
  validateVariable(variable: string, value: string): ValidationError | null {
    // Firebase API key validation
    if (
      variable === 'REACT_APP_FIREBASE_API_KEY' &&
      !value.startsWith('AIza')
    ) {
      return {
        variable,
        message: 'Firebase API key format appears invalid',
        severity: 'error',
        suggestion: 'Verify your Firebase API key in the Firebase Console',
      };
    }

    // OpenAI API key validation
    if (variable === 'REACT_APP_OPENAI_API_KEY' && !value.startsWith('sk-')) {
      return {
        variable,
        message: 'OpenAI API key format appears invalid',
        severity: 'error',
        suggestion: 'Verify your OpenAI API key in the OpenAI dashboard',
      };
    }

    // URL validation
    if (variable.includes('URL') && value) {
      try {
        new URL(value);
      } catch {
        return {
          variable,
          message: 'Invalid URL format',
          severity: 'error',
          suggestion:
            'Ensure the URL is properly formatted (e.g., https://example.com)',
        };
      }
    }

    return null;
  }

  /**
   * Get environment variable documentation
   */
  getDocumentation(): Record<
    string,
    { description: string; required: boolean; example?: string }
  > {
    const docs: Record<
      string,
      { description: string; required: boolean; example?: string }
    > = {};

    // Add required variables
    for (const [variable, description] of Object.entries(this.requiredVars)) {
      docs[variable] = {
        description,
        required: true,
        example: this.getExampleValue(variable),
      };
    }

    // Add optional variables
    for (const [variable, description] of Object.entries(this.optionalVars)) {
      docs[variable] = {
        description,
        required: false,
        example: this.getExampleValue(variable),
      };
    }

    return docs;
  }

  /**
   * Get example value for environment variable
   */
  private getExampleValue(variable: string): string | undefined {
    const examples: Record<string, string> = {
      REACT_APP_FIREBASE_API_KEY: 'AIzaSyB2iWL0UkuLJYpr-II9IpwGWDOMnLcfq_c',
      REACT_APP_FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
      REACT_APP_FIREBASE_PROJECT_ID: 'your-project-id',
      REACT_APP_FIREBASE_STORAGE_BUCKET: 'your-project.appspot.com',
      REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
      REACT_APP_FIREBASE_APP_ID: '1:123456789012:web:abcdef1234567890',
      REACT_APP_OPENAI_API_KEY:
        'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
      REACT_APP_API_BASE_URL: 'https://api.coachcore.ai/api',
      REACT_APP_AI_SERVICE_URL: 'https://ai.coachcore.ai',
      REACT_APP_SENTRY_DSN:
        'https://1234567890abcdef1234567890abcdef@o123456.ingest.sentry.io/123456',
    };

    return examples[variable];
  }

  /**
   * Generate .env.example file content
   */
  generateEnvExample(): string {
    let content = '# Coach Core AI Environment Configuration\n';
    content += '# Copy this file to .env.local and fill in your values\n\n';

    // Add required variables
    content += '# Required Environment Variables\n';
    for (const [variable, description] of Object.entries(this.requiredVars)) {
      content += `# ${description}\n`;
      content += `${variable}=\n`;
      content += '\n';
    }

    // Add optional variables
    content += '# Optional Environment Variables\n';
    for (const [variable, description] of Object.entries(this.optionalVars)) {
      content += `# ${description}\n`;
      content += `# ${variable}=\n`;
      content += '\n';
    }

    return content;
  }
}

// Export singleton instance
export const environmentValidator = new EnvironmentValidator();

// Export convenience functions
export const validateEnvironment = () => environmentValidator.validate();
export const validateVariable = (variable: string, value: string) =>
  environmentValidator.validateVariable(variable, value);
export const getEnvironmentDocs = () => environmentValidator.getDocumentation();
export const generateEnvExample = () =>
  environmentValidator.generateEnvExample();
