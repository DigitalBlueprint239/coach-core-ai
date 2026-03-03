import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  VStack,
  useToast,
  Link as ChakraLink,
  HStack,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import QRCode from 'qrcode';
import { z } from 'zod';
import { Share2, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  connectYoutubeAccount,
  linkManualAsset,
  ManualProvider,
  syncYoutubeAssets,
} from '@/features/recruiting';
import useRecruitingProfile from '@/features/recruiting/hooks/useRecruitingProfile';
import {
  AssetGrid,
  ExternalAccountLinker,
  ProfileCompletionMeter,
} from '@/features/recruiting/components';
import type { ExternalAccountDescriptor } from '@/features/recruiting/components/ExternalAccountLinker';

const dominantHandOptions = ['left', 'right', 'ambidextrous'] as const;

type FormValues = {
  name: string;
  gradYear: string;
  positionPrimary: string;
  positionsSecondary: string;
  heightIn: string;
  weightLb: string;
  dominantHand: string;
  bio: string;
  gpa: string;
  act: string;
  sat: string;
  transcriptUrl: string;
  forty: string;
  shuttle: string;
  vertical: string;
  bench: string;
  youtubeUrl: string;
  hudlUrl: string;
  instagramUrl: string;
  maxPrepsUrl: string;
  twitterHandle: string;
};

const numericField = (min: number, max: number, label: string) =>
  z.coerce
    .number()
    .refine((value) => !Number.isNaN(value), `${label} must be a number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

const fieldValidators = {
  name: z.string().min(2, 'Name must be at least 2 characters'),
  gradYear: z.coerce
    .number()
    .refine((value) => !Number.isNaN(value), 'Graduation year must be a number')
    .int('Graduation year must be a whole number')
    .min(new Date().getFullYear() - 1, 'Graduation year too low')
    .max(new Date().getFullYear() + 5, 'Graduation year too high'),
  positionPrimary: z.string().min(2, 'Enter a position'),
  heightIn: numericField(58, 84, 'Height'),
  weightLb: numericField(120, 350, 'Weight'),
  bio: z.string().max(800, 'Bio must be under 800 characters'),
  gpa: numericField(0, 5, 'GPA'),
  act: numericField(1, 36, 'ACT'),
  sat: numericField(400, 1600, 'SAT'),
  transcriptUrl: z.string().url('Enter a valid URL'),
  forty: numericField(3.5, 6, '40 yard dash'),
  shuttle: numericField(3, 6, 'Shuttle time'),
  vertical: numericField(20, 60, 'Vertical jump'),
  bench: numericField(0, 40, 'Bench reps'),
  youtubeUrl: z.string().url('Enter a valid URL'),
  hudlUrl: z.string().url('Enter a valid URL'),
  instagramUrl: z.string().url('Enter a valid URL'),
  maxPrepsUrl: z.string().url('Enter a valid URL'),
  twitterHandle: z.string().regex(/^@?[A-Za-z0-9_]{1,15}$/, 'Enter a valid handle'),
  positionsSecondary: z.string().max(120, 'Too many positions'),
};

type FieldKey = keyof FormValues;

const optionalFields: FieldKey[] = [
  'bio',
  'gpa',
  'act',
  'sat',
  'transcriptUrl',
  'forty',
  'shuttle',
  'vertical',
  'bench',
  'youtubeUrl',
  'hudlUrl',
  'instagramUrl',
  'maxPrepsUrl',
  'twitterHandle',
  'positionsSecondary',
];

const isOptional = (field: FieldKey) => optionalFields.includes(field);

type ManualLinkProvider = Exclude<ManualProvider, 'twitter'>;

const buildFormValues = (values: ReturnType<typeof useRecruitingProfile>['profile']['athlete']): FormValues => ({
  name: values.name ?? '',
  gradYear: values.gradYear ? String(values.gradYear) : String(new Date().getFullYear() + 2),
  positionPrimary: values.positionPrimary ?? '',
  positionsSecondary: (values.positionsSecondary ?? []).join(', '),
  heightIn: values.heightIn ? String(values.heightIn) : '72',
  weightLb: values.weightLb ? String(values.weightLb) : '195',
  dominantHand: values.dominantHand ?? '',
  bio: values.bio ?? '',
  gpa: values.gpa ? String(values.gpa) : '',
  act: values.act ? String(values.act) : '',
  sat: values.sat ? String(values.sat) : '',
  transcriptUrl: values.transcriptUrl ?? '',
  forty: values.measurables?.forty ? String(values.measurables.forty) : '',
  shuttle: values.measurables?.shuttle ? String(values.measurables.shuttle) : '',
  vertical: values.measurables?.vertical ? String(values.measurables.vertical) : '',
  bench: values.measurables?.bench ? String(values.measurables.bench) : '',
  youtubeUrl: values.youtubeUrl ?? '',
  hudlUrl: values.hudlUrl ?? '',
  instagramUrl: values.instagramUrl ?? '',
  maxPrepsUrl: values.maxPrepsUrl ?? '',
  twitterHandle: values.twitterHandle ?? '',
});

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <AccordionItem border="none">
    <h3>
      <AccordionButton px={4} py={3} borderRadius="md" _expanded={{ bg: 'blue.50' }}>
        <Box flex="1" textAlign="left">
          <Heading size="sm">{title}</Heading>
          <Text fontSize="xs" color="gray.500">
            {description}
          </Text>
        </Box>
        <AccordionIcon />
      </AccordionButton>
    </h3>
    <AccordionPanel pb={6}>{children}</AccordionPanel>
  </AccordionItem>
);

export const RecruitingProfilePage = () => {
  const toast = useToast();
  const { user } = useAuth();
  const {
    profile,
    completion,
    saveStatus,
    nextActions,
    updateAthlete,
    updateLinkedAccount,
    updatePrivacy,
    addAsset,
  } = useRecruitingProfile();

  const [formValues, setFormValues] = useState<FormValues>(() => buildFormValues(profile.athlete));
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const publicHandle = useMemo(
    () => profile.athlete.twitterHandle?.replace('@', '') || 'athlete',
    [profile.athlete.twitterHandle]
  );

  useEffect(() => {
    setFormValues(buildFormValues(profile.athlete));
  }, [profile.lastUpdated]);

  const handleFieldChange = (field: FieldKey, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));

    if (isOptional(field) && value.trim() === '') {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      commitField(field, undefined);
      return;
    }

    const schema = fieldValidators[field as keyof typeof fieldValidators];
    if (!schema) {
      commitField(field, value);
      return;
    }

    const parseResult = schema.safeParse(value);
    if (!parseResult.success) {
      setErrors((prev) => ({ ...prev, [field]: parseResult.error.issues[0]?.message ?? 'Invalid value' }));
      return;
    }

    setErrors((prev) => ({ ...prev, [field]: undefined }));
    commitField(field, parseResult.data);
  };

  const commitField = (field: FieldKey, rawValue: unknown) => {
    switch (field) {
      case 'name':
      case 'positionPrimary':
      case 'twitterHandle':
      case 'youtubeUrl':
      case 'hudlUrl':
      case 'instagramUrl':
      case 'maxPrepsUrl':
      case 'transcriptUrl':
        updateAthlete({ [field]: rawValue ? String(rawValue) : undefined } as Record<string, unknown>);
        break;
      case 'gradYear':
      case 'heightIn':
      case 'weightLb':
        updateAthlete({ [field]: rawValue as number | undefined } as Record<string, unknown>);
        break;
      case 'bio':
        updateAthlete({ bio: (rawValue as string | undefined) ?? '' } as Record<string, unknown>);
        break;
      case 'positionsSecondary': {
        const list = typeof rawValue === 'string'
          ? rawValue.split(',').map((token) => token.trim()).filter(Boolean)
          : [];
        updateAthlete({ positionsSecondary: list });
        break;
      }
      case 'dominantHand':
        if (typeof rawValue === 'string' && dominantHandOptions.includes(rawValue as typeof dominantHandOptions[number])) {
          updateAthlete({ dominantHand: rawValue as typeof dominantHandOptions[number] });
        } else {
          updateAthlete({ dominantHand: undefined });
        }
        break;
      case 'gpa':
      case 'act':
      case 'sat':
        updateAthlete({ [field]: rawValue as number | undefined } as Record<string, unknown>);
        break;
      case 'forty':
      case 'shuttle':
      case 'vertical':
      case 'bench': {
        const value = rawValue as number | undefined;
        updateAthlete({
          measurables: {
            ...profile.athlete.measurables,
            [field]: value,
          },
        });
        break;
      }
      default:
        break;
    }
  };

  const requireAuth = () => {
    if (!user?.uid) {
      toast({
        title: 'Sign in required',
        description: 'Sign in to manage recruiting links.',
        status: 'warning',
      });
      return false;
    }
    return true;
  };

  const handleYoutubeConnect = async () => {
    if (!formValues.youtubeUrl.trim()) {
      toast({
        title: 'Channel URL required',
        description: 'Enter a valid YouTube channel URL or handle.',
        status: 'error',
      });
      return;
    }

    if (!requireAuth()) return;

    setProviderLoading('youtube');
    try {
      const result = await connectYoutubeAccount({
        userId: user!.uid,
        channelUrl: formValues.youtubeUrl.trim(),
      });

      if (!result) {
        throw new Error('Unable to connect channel. Double check the URL or handle.');
      }

      updateLinkedAccount('youtube', 'connected', formValues.youtubeUrl.trim());
      try {
        const syncedAssets = await syncYoutubeAssets(user!.uid);
        syncedAssets.forEach((asset) => {
          addAsset({
            id: asset.id,
            provider: 'youtube',
            title: asset.meta?.tags?.[0] ?? 'YouTube Highlight',
            url: asset.sourceUrl,
            metrics: {
              views: asset.meta?.views,
              likes: asset.meta?.likes,
              timestamp: asset.meta?.timestamp?.toString(),
            },
          });
        });
      } catch (syncError) {
        toast({
          title: 'Connected, but sync delayed',
          description:
            syncError instanceof Error ? syncError.message : 'Highlights will sync shortly.',
          status: 'warning',
        });
      }
      toast({ title: 'YouTube connected', status: 'success' });
    } catch (error) {
      toast({
        title: 'YouTube connection failed',
        description: error instanceof Error ? error.message : 'Try again later.',
        status: 'error',
      });
    } finally {
      setProviderLoading(null);
    }
  };

  const handleManualLink = async (provider: ManualLinkProvider, value: string) => {
    if (!value.trim()) {
      toast({
        title: 'Link required',
        description: 'Provide a valid URL or handle before saving.',
        status: 'error',
      });
      return;
    }

    if (!requireAuth()) return;

    setProviderLoading(provider);
    try {
      const asset = await linkManualAsset({
        userId: user!.uid,
        provider,
        url: value.trim(),
      });

      if (!asset) {
        throw new Error('Could not save link.');
      }

      updateLinkedAccount(provider, 'manual', asset.sourceUrl);
      addAsset({
        id: asset.id,
        provider,
        title: `${provider.toUpperCase()} manual link`,
        url: asset.sourceUrl,
        metrics: {
          timestamp: asset.createdAt?.toString(),
        },
      });

      toast({ title: 'Link saved', status: 'success' });
    } catch (error) {
      toast({
        title: 'Unable to save link',
        description: error instanceof Error ? error.message : 'Try again with a valid URL.',
        status: 'error',
      });
    } finally {
      setProviderLoading(null);
    }
  };

  const providerDescriptors: ExternalAccountDescriptor[] = [
    {
      key: 'youtube',
      label: 'YouTube',
      status: profile.linkedAccounts.youtube.status,
      url: profile.linkedAccounts.youtube.url,
      helperText: 'Connect to auto-sync highlight uploads.',
      lastSyncedAt: profile.linkedAccounts.youtube.lastSyncedAt,
      onConnect: handleYoutubeConnect,
      isLoading: providerLoading === 'youtube',
    },
    {
      key: 'hudl',
      label: 'Hudl',
      status: profile.linkedAccounts.hudl.status,
      url: profile.linkedAccounts.hudl.url,
      helperText: 'Paste your Hudl profile link for manual sync.',
      onManualLink: () => handleManualLink('hudl', formValues.hudlUrl),
      isLoading: providerLoading === 'hudl',
    },
    {
      key: 'instagram',
      label: 'Instagram',
      status: profile.linkedAccounts.instagram.status,
      url: profile.linkedAccounts.instagram.url,
      helperText: 'Add reels or training clips from IG.',
      onManualLink: () => handleManualLink('instagram', formValues.instagramUrl),
      isLoading: providerLoading === 'instagram',
    },
    {
      key: 'maxpreps',
      label: 'MaxPreps',
      status: profile.linkedAccounts.maxpreps.status,
      url: profile.linkedAccounts.maxpreps.url,
      helperText: 'Link MaxPreps for verified stats.',
      onManualLink: () => handleManualLink('maxpreps', formValues.maxPrepsUrl),
      isLoading: providerLoading === 'maxpreps',
    },
  ];

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/u/${publicHandle}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Copied public link', status: 'success' });
    } catch (error) {
      toast({ title: 'Unable to copy link', description: String(error), status: 'error' });
    }
  };

  const handleGenerateQr = async () => {
    const url = `${window.location.origin}/u/${publicHandle}`;
    try {
      const dataUrl = await QRCode.toDataURL(url);
      setQrDataUrl(dataUrl);
    } catch (error) {
      toast({ title: 'Failed to generate QR code', description: String(error), status: 'error' });
    }
  };

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="lg" mb={2}>
          Athlete Profile
        </Heading>
        <Text color="gray.600">
          Update your recruiting profile. Changes autosave and power your public recruiting page.
        </Text>
      </Box>

      <ProfileCompletionMeter
        completion={completion}
        readinessScore={profile.readinessScore}
        saveStatus={saveStatus}
        nextActions={nextActions}
      />

      <Accordion allowMultiple defaultIndex={[0, 1]}>
        <Section title="Bio" description="Basics coaches see first: position, measurables, contact.">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <GridItem>
              <FormControl isInvalid={!!errors.name} isRequired>
                <FormLabel>Full Name</FormLabel>
                <Input
                  value={formValues.name}
                  onChange={(event) => handleFieldChange('name', event.target.value)}
                  placeholder="First Last"
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.positionPrimary} isRequired>
                <FormLabel>Primary Position</FormLabel>
                <Input
                  value={formValues.positionPrimary}
                  onChange={(event) => handleFieldChange('positionPrimary', event.target.value)}
                  placeholder="WR, QB, LB..."
                />
                <FormErrorMessage>{errors.positionPrimary}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.positionsSecondary}>
                <FormLabel>Secondary Positions</FormLabel>
                <Input
                  value={formValues.positionsSecondary}
                  onChange={(event) => handleFieldChange('positionsSecondary', event.target.value)}
                  placeholder="KR, PR"
                />
                <FormErrorMessage>{errors.positionsSecondary}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.gradYear} isRequired>
                <FormLabel>Graduation Year</FormLabel>
                <Input
                  value={formValues.gradYear}
                  onChange={(event) => handleFieldChange('gradYear', event.target.value)}
                  placeholder="2026"
                />
                <FormErrorMessage>{errors.gradYear}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.heightIn} isRequired>
                <FormLabel>Height (inches)</FormLabel>
                <Input
                  value={formValues.heightIn}
                  onChange={(event) => handleFieldChange('heightIn', event.target.value)}
                  placeholder="74"
                />
                <FormErrorMessage>{errors.heightIn}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.weightLb} isRequired>
                <FormLabel>Weight (lbs)</FormLabel>
                <Input
                  value={formValues.weightLb}
                  onChange={(event) => handleFieldChange('weightLb', event.target.value)}
                  placeholder="195"
                />
                <FormErrorMessage>{errors.weightLb}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl>
                <FormLabel>Dominant Hand</FormLabel>
                <Select
                  value={formValues.dominantHand}
                  onChange={(event) => handleFieldChange('dominantHand', event.target.value)}
                >
                  <option value="">Select</option>
                  {dominantHandOptions.map((hand) => (
                    <option key={hand} value={hand}>
                      {hand}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </GridItem>
            <GridItem colSpan={2}>
              <FormControl isInvalid={!!errors.bio}>
                <FormLabel>Recruiting Bio</FormLabel>
                <Textarea
                  rows={4}
                  value={formValues.bio}
                  onChange={(event) => handleFieldChange('bio', event.target.value)}
                  placeholder="Summarize your strengths, accolades, and goals."
                />
                <FormErrorMessage>{errors.bio}</FormErrorMessage>
              </FormControl>
            </GridItem>
          </Grid>
        </Section>

        <Section title="Academics" description="Upload transcripts and standardized test scores.">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <GridItem>
              <FormControl isInvalid={!!errors.gpa}>
                <FormLabel>GPA</FormLabel>
                <Input
                  value={formValues.gpa}
                  onChange={(event) => handleFieldChange('gpa', event.target.value)}
                  placeholder="3.8"
                />
                <FormErrorMessage>{errors.gpa}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.act}>
                <FormLabel>ACT</FormLabel>
                <Input
                  value={formValues.act}
                  onChange={(event) => handleFieldChange('act', event.target.value)}
                  placeholder="28"
                />
                <FormErrorMessage>{errors.act}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.sat}>
                <FormLabel>SAT</FormLabel>
                <Input
                  value={formValues.sat}
                  onChange={(event) => handleFieldChange('sat', event.target.value)}
                  placeholder="1250"
                />
                <FormErrorMessage>{errors.sat}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.transcriptUrl}>
                <FormLabel>Transcript URL</FormLabel>
                <Input
                  value={formValues.transcriptUrl}
                  onChange={(event) => handleFieldChange('transcriptUrl', event.target.value)}
                  placeholder="https://drive.google.com/..."
                />
                <FormErrorMessage>{errors.transcriptUrl}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem colSpan={2}>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="public-academics" mb="0">
                  Show academics on public page
                </FormLabel>
                <Switch
                  id="public-academics"
                  isChecked={profile.privacy.academics}
                  onChange={(event) => updatePrivacy({ academics: event.target.checked })}
                />
              </FormControl>
            </GridItem>
          </Grid>
        </Section>

        <Section title="Measurables" description="Verified combine metrics, wingspan, bench, and shuttle.">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <GridItem>
              <FormControl isInvalid={!!errors.forty}>
                <FormLabel>40 Yard Dash</FormLabel>
                <Input
                  value={formValues.forty}
                  onChange={(event) => handleFieldChange('forty', event.target.value)}
                  placeholder="4.56"
                />
                <FormErrorMessage>{errors.forty}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.shuttle}>
                <FormLabel>Pro Shuttle</FormLabel>
                <Input
                  value={formValues.shuttle}
                  onChange={(event) => handleFieldChange('shuttle', event.target.value)}
                  placeholder="4.2"
                />
                <FormErrorMessage>{errors.shuttle}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.vertical}>
                <FormLabel>Vertical Jump</FormLabel>
                <Input
                  value={formValues.vertical}
                  onChange={(event) => handleFieldChange('vertical', event.target.value)}
                  placeholder="36"
                />
                <FormErrorMessage>{errors.vertical}</FormErrorMessage>
              </FormControl>
            </GridItem>
            <GridItem>
              <FormControl isInvalid={!!errors.bench}>
                <FormLabel>Bench Press (reps @ 185)</FormLabel>
                <Input
                  value={formValues.bench}
                  onChange={(event) => handleFieldChange('bench', event.target.value)}
                  placeholder="15"
                />
                <FormErrorMessage>{errors.bench}</FormErrorMessage>
              </FormControl>
            </GridItem>
          </Grid>
        </Section>

        <Section title="Links & Integrations" description="Connect social/video accounts or paste highlight URLs.">
          <Stack spacing={4}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="public-contact" mb="0">
                Share contact info on public page
              </FormLabel>
              <Switch
                id="public-contact"
                isChecked={profile.privacy.contact}
                onChange={(event) => updatePrivacy({ contact: event.target.checked })}
              />
            </FormControl>

            <FormControl isInvalid={!!errors.youtubeUrl}>
              <FormLabel>YouTube Channel URL or Handle</FormLabel>
              <Input
                value={formValues.youtubeUrl}
                onChange={(event) => handleFieldChange('youtubeUrl', event.target.value)}
                placeholder="https://youtube.com/@handle"
              />
              <FormErrorMessage>{errors.youtubeUrl}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.hudlUrl}>
              <FormLabel>Hudl Profile URL</FormLabel>
              <Input
                value={formValues.hudlUrl}
                onChange={(event) => handleFieldChange('hudlUrl', event.target.value)}
                placeholder="https://www.hudl.com/profile/..."
              />
              <FormErrorMessage>{errors.hudlUrl}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.instagramUrl}>
              <FormLabel>Instagram URL or Handle</FormLabel>
              <Input
                value={formValues.instagramUrl}
                onChange={(event) => handleFieldChange('instagramUrl', event.target.value)}
                placeholder="@handle or https://instagram.com/handle"
              />
              <FormErrorMessage>{errors.instagramUrl}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.maxPrepsUrl}>
              <FormLabel>MaxPreps URL</FormLabel>
              <Input
                value={formValues.maxPrepsUrl}
                onChange={(event) => handleFieldChange('maxPrepsUrl', event.target.value)}
                placeholder="https://www.maxpreps.com/..."
              />
              <FormErrorMessage>{errors.maxPrepsUrl}</FormErrorMessage>
            </FormControl>

            <ExternalAccountLinker providers={providerDescriptors} />
          </Stack>
        </Section>

        <Section title="Media & Notes" description="Tag top plays, upload files, and add endorsements.">
          <VStack align="stretch" spacing={4}>
            <AssetGrid assets={profile.assets} emptyState="No media yet. Link accounts or add manual highlights." />
          </VStack>
        </Section>
      </Accordion>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
        <GridItem>
          <VStack align="stretch" spacing={3} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
            <Heading size="sm">Share your public page</Heading>
            <Text fontSize="sm" color="gray.600">
              Coaches can view without logging in. Copy the link or generate a QR code for camps and events.
            </Text>
            <HStack>
              <Button leftIcon={<Share2 size={16} />} onClick={handleCopyLink} variant="outline">
                Copy link
              </Button>
              <Button leftIcon={<QrCode size={16} />} onClick={handleGenerateQr}>
                Generate QR
              </Button>
            </HStack>
            {qrDataUrl && <Box as="img" src={qrDataUrl} alt="QR code" maxW="160px" />}
            <ChakraLink as={RouterLink} to={`/u/${publicHandle}`} color="blue.500" fontSize="sm" target="_blank">
              View public page
            </ChakraLink>
          </VStack>
        </GridItem>
        <GridItem>
          <VStack align="stretch" spacing={3} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
            <Heading size="sm">Need help?</Heading>
            <Text fontSize="sm" color="gray.600">
              Connect your highlight accounts first. Manual links still count towards readiness, and AI clips will sync once connected.
            </Text>
            <Text fontSize="sm" color="gray.600">
              Have archived film or documents? Email support@coachcore.ai and we will bulk import them for you.
            </Text>
          </VStack>
        </GridItem>
      </Grid>
    </VStack>
  );
};

export default RecruitingProfilePage;
