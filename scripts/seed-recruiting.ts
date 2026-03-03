import admin from 'firebase-admin';
import path from 'path';

type SeedOptions = {
  projectId: string;
  dryRun: boolean;
};

const DEFAULT_PROJECT = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-project';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const projectFlagIndex = args.findIndex((arg) => arg === '--project');
const projectId = projectFlagIndex >= 0 && args[projectFlagIndex + 1] ? args[projectFlagIndex + 1] : DEFAULT_PROJECT;

const credentialPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_CREDENTIAL_PATH ||
  path.resolve('serviceAccount.json');

const createTimestamp = (iso: string) => admin.firestore.Timestamp.fromDate(new Date(iso));

const athleteSeeds = [
  {
    name: 'Jordan Blake',
    positionPrimary: 'WR',
    gradYear: 2026,
    heightIn: 74,
    weightLb: 190,
    measurables: { forty: 4.51, shuttle: 4.19, vertical: 35, bench: 12 },
    schoolId: 'westlake-high',
  },
  {
    name: 'Micah Turner',
    positionPrimary: 'QB',
    gradYear: 2027,
    heightIn: 75,
    weightLb: 205,
    measurables: { forty: 4.78, shuttle: 4.32, vertical: 32, bench: 8 },
    schoolId: 'georgia-prep',
  },
  {
    name: 'Elijah Brooks',
    positionPrimary: 'RB',
    gradYear: 2026,
    heightIn: 71,
    weightLb: 198,
    measurables: { forty: 4.45, shuttle: 4.1, vertical: 37, bench: 16 },
    schoolId: 'louisville-central',
  },
  {
    name: 'Keon Smith',
    positionPrimary: 'DB',
    gradYear: 2026,
    heightIn: 72,
    weightLb: 182,
    measurables: { forty: 4.46, shuttle: 4.08, vertical: 36, bench: 11 },
    schoolId: 'southlake-carroll',
  },
  {
    name: 'Noah Jackson',
    positionPrimary: 'WR',
    gradYear: 2027,
    heightIn: 73,
    weightLb: 188,
    measurables: { forty: 4.48, shuttle: 4.2, vertical: 34, bench: 10 },
    schoolId: 'mater-dei',
  },
  {
    name: 'Aiden Carter',
    positionPrimary: 'QB',
    gradYear: 2028,
    heightIn: 76,
    weightLb: 210,
    measurables: { forty: 4.83, shuttle: 4.4, vertical: 31, bench: 6 },
    schoolId: 'bishop-gorman',
  },
  {
    name: 'Zion Walker',
    positionPrimary: 'RB',
    gradYear: 2027,
    heightIn: 70,
    weightLb: 195,
    measurables: { forty: 4.43, shuttle: 4.16, vertical: 38, bench: 18 },
    schoolId: 'img-academy',
  },
  {
    name: 'Tyrell Johnson',
    positionPrimary: 'DB',
    gradYear: 2028,
    heightIn: 71,
    weightLb: 178,
    measurables: { forty: 4.49, shuttle: 4.12, vertical: 35, bench: 9 },
    schoolId: 'st-john-bosco',
  },
  {
    name: 'Caleb Foster',
    positionPrimary: 'WR',
    gradYear: 2026,
    heightIn: 73,
    weightLb: 192,
    measurables: { forty: 4.5, shuttle: 4.18, vertical: 36, bench: 13 },
    schoolId: 'allen-high',
  },
  {
    name: 'Miles Henderson',
    positionPrimary: 'QB',
    gradYear: 2026,
    heightIn: 74,
    weightLb: 208,
    measurables: { forty: 4.76, shuttle: 4.29, vertical: 33, bench: 9 },
    schoolId: 'parkview-baptist',
  },
  {
    name: 'Jamari Lewis',
    positionPrimary: 'RB',
    gradYear: 2028,
    heightIn: 71,
    weightLb: 200,
    measurables: { forty: 4.47, shuttle: 4.11, vertical: 37, bench: 17 },
    schoolId: 'mission-viejo',
  },
  {
    name: 'Xavier Brown',
    positionPrimary: 'DB',
    gradYear: 2027,
    heightIn: 72,
    weightLb: 185,
    measurables: { forty: 4.44, shuttle: 4.05, vertical: 38, bench: 10 },
    schoolId: 'de-la-salle',
  },
  {
    name: 'Dillon Warren',
    positionPrimary: 'WR',
    gradYear: 2028,
    heightIn: 72,
    weightLb: 186,
    measurables: { forty: 4.49, shuttle: 4.2, vertical: 35, bench: 12 },
    schoolId: 'st-thomas-aquinas',
  },
  {
    name: 'Logan Pierce',
    positionPrimary: 'QB',
    gradYear: 2027,
    heightIn: 75,
    weightLb: 212,
    measurables: { forty: 4.8, shuttle: 4.35, vertical: 32, bench: 8 },
    schoolId: 'cedar-hill',
  },
  {
    name: 'Marcus Reid',
    positionPrimary: 'RB',
    gradYear: 2026,
    heightIn: 69,
    weightLb: 198,
    measurables: { forty: 4.42, shuttle: 4.15, vertical: 39, bench: 19 },
    schoolId: 'north-shore',
  },
  {
    name: 'Gabriel Bryant',
    positionPrimary: 'DB',
    gradYear: 2026,
    heightIn: 73,
    weightLb: 184,
    measurables: { forty: 4.43, shuttle: 4.07, vertical: 37, bench: 12 },
    schoolId: 'central-catholic',
  },
  {
    name: 'Preston Hayes',
    positionPrimary: 'WR',
    gradYear: 2027,
    heightIn: 74,
    weightLb: 194,
    measurables: { forty: 4.46, shuttle: 4.19, vertical: 36, bench: 14 },
    schoolId: 'lake-travis',
  },
  {
    name: 'Bryce Coleman',
    positionPrimary: 'QB',
    gradYear: 2028,
    heightIn: 76,
    weightLb: 214,
    measurables: { forty: 4.79, shuttle: 4.33, vertical: 31, bench: 7 },
    schoolId: 'mater-dei',
  },
  {
    name: 'Jalen Matthews',
    positionPrimary: 'RB',
    gradYear: 2027,
    heightIn: 70,
    weightLb: 202,
    measurables: { forty: 4.44, shuttle: 4.14, vertical: 38, bench: 18 },
    schoolId: 'img-academy',
  },
  {
    name: 'Chase Porter',
    positionPrimary: 'DB',
    gradYear: 2028,
    heightIn: 72,
    weightLb: 180,
    measurables: { forty: 4.48, shuttle: 4.1, vertical: 36, bench: 11 },
    schoolId: 'st-john-bosco',
  },
];

const programSeeds = [
  { name: 'Coastal State University', level: 'D1', conference: 'Sun Belt', location: 'Myrtle Beach, SC' },
  { name: 'Northern Lights College', level: 'D2', conference: 'GNAC', location: 'Anchorage, AK' },
  { name: 'Lakeview University', level: 'D3', conference: 'SCIAC', location: 'Pasadena, CA' },
  { name: 'Midwest Tech', level: 'NAIA', conference: 'Heart of America', location: 'Des Moines, IA' },
  { name: 'Gulf Coast University', level: 'D1', conference: 'AAC', location: 'Tampa, FL' },
  { name: 'Riverbend College', level: 'D2', conference: 'GLIAC', location: 'Grand Rapids, MI' },
  { name: 'Summit Valley University', level: 'D3', conference: 'NESCAC', location: 'Burlington, VT' },
  { name: 'Prairie State', level: 'NAIA', conference: 'GPAC', location: 'Sioux Falls, SD' },
  { name: 'Coastal Ridge College', level: 'D2', conference: 'Gulf South', location: 'Mobile, AL' },
  { name: 'Capital City University', level: 'D1', conference: 'Big Sky', location: 'Boise, ID' },
];

const youTubeAssetTemplates = [
  {
    title: 'Junior Year Highlights',
    url: 'https://youtu.be/dQw4w9WgXcQ',
    likes: 1200,
    views: 25000,
    tags: ['highlight', 'offense'],
  },
  {
    title: 'Game Winning Touchdown',
    url: 'https://youtu.be/oHg5SJYRHA0',
    likes: 850,
    views: 18000,
    tags: ['clutch', 'game', 'offense'],
  },
  {
    title: 'Season Recap',
    url: 'https://youtu.be/3GwjfUFyY6M',
    likes: 640,
    views: 14200,
    tags: ['season', 'recap'],
  },
];

const manualAssetTemplates = [
  {
    provider: 'hudl',
    url: 'https://www.hudl.com/video/Hudl2/seed-athlete',
    tags: ['hudl', 'highlight'],
  },
  {
    provider: 'instagram',
    url: 'https://www.instagram.com/p/seedathlete/',
    tags: ['social', 'training'],
  },
  {
    provider: 'maxpreps',
    url: 'https://www.maxpreps.com/athlete/seed-athlete',
    tags: ['stats', 'season'],
  },
];

const buildAthlete = (index: number) => {
  const base = athleteSeeds[index % athleteSeeds.length];
  const id = `seed-athlete-${(index + 1).toString().padStart(2, '0')}`;
  const userId = `seed-user-${(index + 1).toString().padStart(2, '0')}`;
  const readiness = 62 + (index % 15);
  const createdAt = createTimestamp(`2025-01-${(index % 20 + 1).toString().padStart(2, '0')}T12:00:00Z`);

  return {
    id,
    userId,
    name: base.name,
    gradYear: base.gradYear,
    positionPrimary: base.positionPrimary,
    positionsSecondary: base.positionPrimary === 'WR' ? ['KR'] : base.positionPrimary === 'QB' ? ['ATH'] : ['ST'],
    heightIn: base.heightIn,
    weightLb: base.weightLb,
    wingspanIn: base.heightIn + 4,
    dominantHand: 'right' as const,
    schoolId: base.schoolId,
    teams: ['seed-eagles', 'seed-seven7'],
    hudlUrl: `https://www.hudl.com/profile/${id}`,
    youtubeUrl: `https://youtube.com/@${id}`,
    instagramUrl: `https://instagram.com/${id}`,
    twitterHandle: `@${id}`,
    maxPrepsUrl: `https://www.maxpreps.com/athlete/${id}.htm`,
    transcriptUrl: `https://example.com/transcripts/${id}.pdf`,
    gpa: Number((3.3 + (index % 7) * 0.1).toFixed(2)),
    act: 22 + (index % 8),
    sat: 1050 + (index % 6) * 40,
    measurables: base.measurables,
    highlightReels: [
      {
        id: `${id}-reel-1`,
        url: `https://youtu.be/${id}reel`,
        coverFrame: `https://img.youtube.com/vi/${id}reel/0.jpg`,
        createdAt,
      },
    ],
    recruitingReadinessScore: Math.min(95, readiness),
    tags: ['seed', base.positionPrimary.toLowerCase()],
    endorsements: [],
    createdAt,
    updatedAt: createdAt,
  };
};

const buildProgram = (index: number) => {
  const base = programSeeds[index % programSeeds.length];
  const id = `seed-program-${(index + 1).toString().padStart(2, '0')}`;
  const needs = [
    {
      position: ['WR', 'QB', 'RB', 'DB'][index % 4],
      classYear: 2026 + (index % 3),
      notes: 'Priority recruitment need for upcoming class.',
    },
    {
      position: ['WR', 'QB', 'RB', 'DB'][(index + 1) % 4],
      classYear: 2027 + (index % 2),
      notes: 'Seeking high-character student athlete.',
    },
  ];

  const timestamp = createTimestamp(`2025-02-${(index % 9 + 1).toString().padStart(2, '0')}T15:30:00Z`);

  return {
    id,
    name: base.name,
    level: base.level,
    conference: base.conference,
    location: base.location,
    needs,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const buildYoutubeAsset = (athleteId: string, userId: string, index: number) => {
  const template = youTubeAssetTemplates[index % youTubeAssetTemplates.length];
  const assetId = `seed-yt-asset-${athleteId}-${index + 1}`;
  const timestamp = createTimestamp(`2024-1${(index % 2) + 0}-${(index % 20 + 1).toString().padStart(2, '0')}T18:00:00Z`);

  return {
    id: assetId,
    userId,
    provider: 'youtube' as const,
    assetType: 'video' as const,
    sourceUrl: template.url.replace('seed-athlete', athleteId),
    meta: {
      likes: template.likes + index * 15,
      views: template.views + index * 400,
      timestamp,
      tags: template.tags,
    },
    aiTags: [],
    fingerprint: assetId,
    createdAt: timestamp,
  };
};

const buildManualAsset = (athleteId: string, userId: string, index: number) => {
  const template = manualAssetTemplates[index % manualAssetTemplates.length];
  const assetId = `seed-manual-asset-${athleteId}-${index + 1}`;
  const timestamp = createTimestamp(`2024-11-${(index % 18 + 1).toString().padStart(2, '0')}T13:15:00Z`);

  return {
    id: assetId,
    userId,
    provider: template.provider as 'hudl' | 'instagram' | 'maxpreps',
    assetType: template.provider === 'maxpreps' ? 'stat' : 'video',
    sourceUrl: template.url.replace('seed-athlete', athleteId),
    meta: {
      timestamp,
      tags: template.tags,
    },
    aiTags: [],
    fingerprint: assetId,
    createdAt: timestamp,
  };
};

const seedRecruiting = async ({ projectId: project, dryRun: preview }: SeedOptions) => {
  if (preview) {
    console.log('🧪 Dry run: generating recruiting seed payload');
  } else {
    if (!admin.apps.length) {
      try {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG) {
          admin.initializeApp({ projectId: project });
        } else if (fsExists(credentialPath)) {
          admin.initializeApp({
            credential: admin.credential.cert(credentialPath),
            projectId: project,
          });
        } else {
          admin.initializeApp({ projectId: project });
        }
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin SDK', error);
        throw error;
      }
    }
  }

  const athletes = Array.from({ length: 20 }, (_, index) => buildAthlete(index));
  const programs = Array.from({ length: 10 }, (_, index) => buildProgram(index));

  const importedAssets = athletes.flatMap((athlete, index) => {
    const ytAssets = Array.from({ length: 2 }, (_, assetIndex) =>
      buildYoutubeAsset(athlete.id, athlete.userId, index * 2 + assetIndex)
    );
    const manualAssets = [
      buildManualAsset(athlete.id, athlete.userId, index),
    ];
    return [...ytAssets, ...manualAssets];
  });

  if (preview) {
    console.log(JSON.stringify({ athletes, programs, importedAssetsCount: importedAssets.length }, null, 2));
    return;
  }

  const db = admin.firestore();

  console.log(`🏈 Seeding recruiting data into project "${project}"...`);

  for (const athlete of athletes) {
    await db.collection('athletes').doc(athlete.id).set(athlete, { merge: true });
  }

  for (const program of programs) {
    await db.collection('programs').doc(program.id).set(program, { merge: true });
  }

  for (const asset of importedAssets) {
    await db.collection('importedAssets').doc(asset.id).set(asset, { merge: true });
  }

  console.log(`✅ Seed complete: ${athletes.length} athletes, ${programs.length} programs, ${importedAssets.length} imported assets.`);
};

const fsExists = (filePath: string) => {
  try {
    return require('fs').existsSync(filePath);
  } catch {
    return false;
  }
};

seedRecruiting({ projectId, dryRun })
  .catch((error) => {
    console.error('❌ Recruiting seed failed', error);
    process.exit(1);
  })
  .finally(() => {
    if (admin.apps.length) {
      admin.app().delete().catch(() => undefined);
    }
  });
