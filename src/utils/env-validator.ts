import { z } from 'zod';

export interface AppEnvironment {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseMeasurementId?: string;
  apiBaseUrl: string;
  appEnv: string;
  nodeEnv: string;
  gaMeasurementId?: string;
  sentryDsn?: string;
  stripePublishableKey?: string;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enableStripe: boolean;
  enablePwa: boolean;
  useFirebaseEmulators: boolean;
}

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

const REQUIRED_ALIASES: Partial<Record<RequiredKey, string[]>> = {
  VITE_FIREBASE_API_KEY: ['REACT_APP_FIREBASE_API_KEY'],
  VITE_FIREBASE_AUTH_DOMAIN: ['REACT_APP_FIREBASE_AUTH_DOMAIN'],
  VITE_FIREBASE_PROJECT_ID: ['REACT_APP_FIREBASE_PROJECT_ID'],
  VITE_FIREBASE_STORAGE_BUCKET: ['REACT_APP_FIREBASE_STORAGE_BUCKET'],
  VITE_FIREBASE_MESSAGING_SENDER_ID: ['REACT_APP_FIREBASE_MESSAGING_SENDER_ID'],
  VITE_FIREBASE_APP_ID: ['REACT_APP_FIREBASE_APP_ID'],
};

const OPTIONAL_ALIASES: Partial<Record<string, string[]>> = {
  VITE_FIREBASE_MEASUREMENT_ID: ['REACT_APP_FIREBASE_MEASUREMENT_ID'],
  VITE_API_BASE_URL: ['REACT_APP_API_BASE_URL'],
  VITE_GA_MEASUREMENT_ID: ['REACT_APP_GA_MEASUREMENT_ID'],
  VITE_SENTRY_DSN: ['REACT_APP_SENTRY_DSN'],
  VITE_STRIPE_PUBLISHABLE_KEY: ['REACT_APP_STRIPE_PUBLISHABLE_KEY'],
  VITE_ENABLE_ANALYTICS: ['REACT_APP_ENABLE_ANALYTICS'],
  VITE_ENABLE_ERROR_REPORTING: ['REACT_APP_ENABLE_ERROR_REPORTING'],
  VITE_ENABLE_STRIPE: ['REACT_APP_ENABLE_STRIPE', 'REACT_APP_ENABLE_STRIPE_INTEGRATION'],
  VITE_ENABLE_PWA: ['REACT_APP_ENABLE_PWA'],
  VITE_APP_ENV: ['REACT_APP_ENVIRONMENT', 'MODE'],
  NODE_ENV: ['MODE'],
  VITE_USE_FIREBASE_EMULATORS: ['VITE_USE_EMULATOR', 'REACT_APP_USE_EMULATOR'],
};

const BOOLEAN_TRUE_VALUES = ['true', '1', 'yes', 'on'] as const;
const BOOLEAN_FALSE_VALUES = ['false', '0', 'no', 'off'] as const;

const TRUE_VALUES = new Set<string>(BOOLEAN_TRUE_VALUES);
const FALSE_VALUES = new Set<string>(BOOLEAN_FALSE_VALUES);

type EnvSource = Record<string, string | boolean | undefined>;

const envSchema: z.ZodType<AppEnvironment> = z.object({
  firebaseApiKey: z.string().min(1),
  firebaseAuthDomain: z.string().min(1),
  firebaseProjectId: z.string().min(1),
  firebaseStorageBucket: z.string().min(1),
  firebaseMessagingSenderId: z.string().min(1),
  firebaseAppId: z.string().min(1),
  firebaseMeasurementId: z.string().min(1).optional(),
  apiBaseUrl: z.string().min(1),
  appEnv: z.string().min(1),
  nodeEnv: z.string().min(1),
  gaMeasurementId: z.string().min(1).optional(),
  sentryDsn: z.string().min(1).optional(),
  stripePublishableKey: z.string().min(1).optional(),
  enableAnalytics: z.boolean(),
  enableErrorReporting: z.boolean(),
  enableStripe: z.boolean(),
  enablePwa: z.boolean(),
  useFirebaseEmulators: z.boolean(),
});

const collectEnvSources = (): EnvSource => {
  const sources: EnvSource[] = [];

  if (typeof process !== 'undefined' && process.env) {
    sources.push(process.env as EnvSource);
  }

  const metaEnv = (import.meta as unknown as { env?: EnvSource }).env;
  if (metaEnv) {
    sources.push(metaEnv);
  }

  return Object.assign({}, ...sources);
};

export const validateEnv = (): AppEnvironment => {
  const envSource = collectEnvSources();
  const aliasWarnings = new Set<string>();

  const readValue = (key: string): string | undefined => {
    const raw = envSource[key];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof raw === 'boolean') {
      return raw ? 'true' : 'false';
    }
    if (typeof raw === 'number') {
      return String(raw);
    }
    return undefined;
  };

  const hasValue = (primary: string, fallbacks: string[] = []): boolean => {
    if (readValue(primary) !== undefined) {
      return true;
    }

    return fallbacks.some((fallback) => readValue(fallback) !== undefined);
  };

  const readWithFallback = (primary: string, fallbacks: string[] = []): string | undefined => {
    const direct = readValue(primary);
    if (direct !== undefined) {
      return direct;
    }

    for (const fallback of fallbacks) {
      const candidate = readValue(fallback);
      if (candidate !== undefined) {
        aliasWarnings.add(`${primary}::${fallback}`);
        return candidate;
      }
    }

    return undefined;
  };

  const requireValue = (primary: RequiredKey, fallbacks: string[] = []): string => {
    const value = readWithFallback(primary, fallbacks);
    if (!value) {
      throw new Error(`[env-validator] Missing required environment variable: ${primary}`);
    }
    return value;
  };

  const optionalString = (primary: string, fallbacks: string[] = []): string | undefined =>
    readWithFallback(primary, fallbacks);

  const parseBooleanFlag = (
    primary: string,
    defaultValue = false,
    fallbacks: string[] = []
  ): boolean => {
    const value = readWithFallback(primary, fallbacks);
    if (value === undefined) {
      return defaultValue;
    }

    const normalized = value.toLowerCase();
    if (TRUE_VALUES.has(normalized)) {
      return true;
    }
    if (FALSE_VALUES.has(normalized)) {
      return false;
    }

    throw new Error(
      `[env-validator] Invalid boolean value for ${primary}: ${value}. Expected one of ${[
        ...BOOLEAN_TRUE_VALUES,
        ...BOOLEAN_FALSE_VALUES,
      ].join(', ')}.`
    );
  };

  const missingKeys = REQUIRED_KEYS.filter(
    (key) => !hasValue(key, REQUIRED_ALIASES[key] ?? [])
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `[env-validator] Missing required environment variables: ${missingKeys.join(', ')}.`
    );
  }

  const apiBaseUrl =
    optionalString('VITE_API_BASE_URL', OPTIONAL_ALIASES.VITE_API_BASE_URL ?? []) ??
    'http://localhost:3000';

  const appEnv =
    optionalString('VITE_APP_ENV', OPTIONAL_ALIASES.VITE_APP_ENV ?? []) ?? 'development';

  const nodeEnv =
    optionalString('NODE_ENV', OPTIONAL_ALIASES.NODE_ENV ?? []) ?? appEnv;

  const parsed = envSchema.parse({
    firebaseApiKey: requireValue(
      'VITE_FIREBASE_API_KEY',
      REQUIRED_ALIASES.VITE_FIREBASE_API_KEY ?? []
    ),
    firebaseAuthDomain: requireValue(
      'VITE_FIREBASE_AUTH_DOMAIN',
      REQUIRED_ALIASES.VITE_FIREBASE_AUTH_DOMAIN ?? []
    ),
    firebaseProjectId: requireValue(
      'VITE_FIREBASE_PROJECT_ID',
      REQUIRED_ALIASES.VITE_FIREBASE_PROJECT_ID ?? []
    ),
    firebaseStorageBucket: requireValue(
      'VITE_FIREBASE_STORAGE_BUCKET',
      REQUIRED_ALIASES.VITE_FIREBASE_STORAGE_BUCKET ?? []
    ),
    firebaseMessagingSenderId: requireValue(
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      REQUIRED_ALIASES.VITE_FIREBASE_MESSAGING_SENDER_ID ?? []
    ),
    firebaseAppId: requireValue(
      'VITE_FIREBASE_APP_ID',
      REQUIRED_ALIASES.VITE_FIREBASE_APP_ID ?? []
    ),
    firebaseMeasurementId: optionalString(
      'VITE_FIREBASE_MEASUREMENT_ID',
      OPTIONAL_ALIASES.VITE_FIREBASE_MEASUREMENT_ID ?? []
    ),
    apiBaseUrl,
    appEnv,
    nodeEnv,
    gaMeasurementId: optionalString(
      'VITE_GA_MEASUREMENT_ID',
      OPTIONAL_ALIASES.VITE_GA_MEASUREMENT_ID ?? []
    ),
    sentryDsn: optionalString('VITE_SENTRY_DSN', OPTIONAL_ALIASES.VITE_SENTRY_DSN ?? []),
    stripePublishableKey: optionalString(
      'VITE_STRIPE_PUBLISHABLE_KEY',
      OPTIONAL_ALIASES.VITE_STRIPE_PUBLISHABLE_KEY ?? []
    ),
    enableAnalytics: parseBooleanFlag(
      'VITE_ENABLE_ANALYTICS',
      false,
      OPTIONAL_ALIASES.VITE_ENABLE_ANALYTICS ?? []
    ),
    enableErrorReporting: parseBooleanFlag(
      'VITE_ENABLE_ERROR_REPORTING',
      false,
      OPTIONAL_ALIASES.VITE_ENABLE_ERROR_REPORTING ?? []
    ),
    enableStripe: parseBooleanFlag(
      'VITE_ENABLE_STRIPE',
      false,
      OPTIONAL_ALIASES.VITE_ENABLE_STRIPE ?? []
    ),
    enablePwa: parseBooleanFlag(
      'VITE_ENABLE_PWA',
      false,
      OPTIONAL_ALIASES.VITE_ENABLE_PWA ?? []
    ),
    useFirebaseEmulators: parseBooleanFlag(
      'VITE_USE_FIREBASE_EMULATORS',
      false,
      OPTIONAL_ALIASES.VITE_USE_FIREBASE_EMULATORS ?? []
    ),
  });

  if (aliasWarnings.size > 0 && typeof console !== 'undefined') {
    aliasWarnings.forEach((entry) => {
      const [primary, fallback] = entry.split('::');
      console.warn(
        `[env-validator] "${fallback}" is deprecated. Please migrate to "${primary}".`
      );
    });
  }

  return Object.freeze(parsed);
};

export const env: AppEnvironment = validateEnv();

export default env;
