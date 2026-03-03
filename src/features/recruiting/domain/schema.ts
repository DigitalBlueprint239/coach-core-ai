import { z } from 'zod';
import { timestampSchema } from '@/services/security/validation-rules';

export const highlightReelRefSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  coverFrame: z.string().url().optional(),
  createdAt: timestampSchema,
});

export const measurablesSchema = z.object({
  forty: z.number().nonnegative().max(60).optional(),
  shuttle: z.number().nonnegative().max(60).optional(),
  vertical: z.number().nonnegative().max(80).optional(),
  bench: z.number().nonnegative().max(1000).optional(),
});

export const athleteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  gradYear: z.number().int().min(1900).max(2100),
  positionPrimary: z.string().min(1),
  positionsSecondary: z.array(z.string().min(1)).default([]),
  heightIn: z.number().int().positive(),
  weightLb: z.number().int().positive(),
  wingspanIn: z.number().positive().optional(),
  handSizeIn: z.number().positive().optional(),
  dominantHand: z.enum(['left', 'right', 'ambidextrous']).optional(),
  schoolId: z.string().optional(),
  teams: z.array(z.string().min(1)).default([]),
  hudlUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  instagramUrl: z.string().url().optional(),
  twitterHandle: z
    .string()
    .regex(/^@?(\w){1,15}$/, 'Invalid Twitter handle')
    .optional(),
  maxPrepsUrl: z.string().url().optional(),
  transcriptUrl: z.string().url().optional(),
  gpa: z.number().min(0).max(5).optional(),
  act: z.number().int().min(1).max(36).optional(),
  sat: z.number().int().min(400).max(1600).optional(),
  measurables: measurablesSchema.optional(),
  highlightReels: z.array(highlightReelRefSchema).default([]),
  recruitingReadinessScore: z.number().min(0).max(100),
  tags: z.array(z.string().min(1)).default([]),
  endorsements: z.array(z.string().min(1)).default([]),
  bio: z.string().max(800).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const coachSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  schoolId: z.string().optional(),
  verified: z.boolean().default(false),
  endorsementsGiven: z.array(z.string().min(1)).default([]),
});

export const programNeedSchema = z.object({
  position: z.string().min(1),
  classYear: z.number().int().min(1900).max(2100),
  notes: z.string().max(1000).optional(),
});

export const programSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(['HS', 'NAIA', 'D3', 'D2', 'D1']),
  conference: z.string().optional(),
  location: z.string().optional(),
  needs: z.array(programNeedSchema).default([]),
});

export const externalAccountMetadataSchema = z
  .object({
    uploadsPlaylistId: z.string().optional(),
    channelTitle: z.string().optional(),
    channelHandle: z.string().optional(),
  })
  .catchall(z.unknown());

export const externalAccountSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: z.enum(['twitter', 'hudl', 'instagram', 'youtube', 'maxpreps']),
  handleOrId: z.string().min(1),
  auth: z
    .object({
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: timestampSchema.optional(),
      metadata: externalAccountMetadataSchema.optional(),
    })
    .optional(),
  lastSyncAt: timestampSchema.optional(),
  syncStatus: z.enum(['ok', 'error', 'revoked']).default('ok'),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      occurredAt: timestampSchema,
    })
    .optional(),
});

export const importedAssetSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: z.enum(['twitter', 'hudl', 'instagram', 'youtube', 'maxpreps']),
  assetType: z.enum(['video', 'clip', 'stat', 'post']),
  sourceUrl: z.string().url(),
  meta: z
    .object({
      likes: z.number().int().nonnegative().optional(),
      views: z.number().int().nonnegative().optional(),
      timestamp: timestampSchema.optional(),
      tags: z.array(z.string().min(1)).optional(),
    })
    .default({}),
  aiTags: z.array(z.string().min(1)).default([]),
  fingerprint: z.string().min(1),
  createdAt: timestampSchema,
});

export const recruitingInsightSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  type: z.enum(['readiness', 'fit', 'exposure']),
  score: z.number().min(0).max(100),
  summary: z.string().max(2000),
  actions: z.array(z.string().max(500)).default([]),
  createdAt: timestampSchema,
});

export const matchSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  programId: z.string().min(1),
  matchScore: z.number().min(0).max(100),
  rationale: z.array(z.string().max(500)).default([]),
  schemeFit: z.array(z.string().max(200)).default([]),
  academicFit: z.enum(['strong', 'average', 'at-risk']).optional(),
  contactStatus: z.enum(['none', 'intro', 'active', 'offer', 'closed']).default('none'),
  updatedAt: timestampSchema,
});

export type Athlete = z.infer<typeof athleteSchema>;
export type Coach = z.infer<typeof coachSchema>;
export type Program = z.infer<typeof programSchema>;
export type ProgramNeed = z.infer<typeof programNeedSchema>;
export type ExternalAccount = z.infer<typeof externalAccountSchema>;
export type ExternalAccountMetadata = z.infer<typeof externalAccountMetadataSchema>;
export type ImportedAsset = z.infer<typeof importedAssetSchema>;
export type RecruitingInsight = z.infer<typeof recruitingInsightSchema>;
export type Match = z.infer<typeof matchSchema>;

export type RecruitingCollection =
  | 'athletes'
  | 'coaches'
  | 'programs'
  | 'externalAccounts'
  | 'importedAssets'
  | 'recruitingInsights'
  | 'matches';

export type CompositeIndexOrder = 'asc' | 'desc';

export interface CompositeIndexField {
  fieldPath: string;
  order?: CompositeIndexOrder;
}

export interface CompositeIndexConfig {
  collection: RecruitingCollection;
  fields: CompositeIndexField[];
  name?: string;
}

export const recruitingIndexes: CompositeIndexConfig[] = [
  {
    collection: 'athletes',
    name: 'athletes_by_position_gradYear',
    fields: [
      { fieldPath: 'positionPrimary', order: 'asc' },
      { fieldPath: 'gradYear', order: 'asc' },
    ],
  },
  {
    collection: 'matches',
    name: 'matches_by_program_matchScore',
    fields: [
      { fieldPath: 'programId', order: 'asc' },
      { fieldPath: 'matchScore', order: 'desc' },
    ],
  },
  {
    collection: 'externalAccounts',
    name: 'externalAccounts_by_user_provider',
    fields: [
      { fieldPath: 'userId', order: 'asc' },
      { fieldPath: 'provider', order: 'asc' },
    ],
  },
];

export const recruitingCollections = {
  athletes: 'athletes',
  coaches: 'coaches',
  programs: 'programs',
  externalAccounts: 'externalAccounts',
  importedAssets: 'importedAssets',
  recruitingInsights: 'recruitingInsights',
  matches: 'matches',
} as const;

export type RecruitingCollectionName = keyof typeof recruitingCollections;
