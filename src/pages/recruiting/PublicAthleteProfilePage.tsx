import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import useRecruitingProfile from '@/features/recruiting/hooks/useRecruitingProfile';
import { AssetGrid, ReadinessScoreCard } from '@/features/recruiting/components';

const StatBlock = ({ label, value }: { label: string; value: string }) => (
  <Stat>
    <StatLabel fontSize="xs" textTransform="uppercase" color="gray.500">
      {label}
    </StatLabel>
    <StatNumber fontSize="lg">{value}</StatNumber>
  </Stat>
);

const providerOrder: Array<'youtube' | 'hudl' | 'instagram' | 'maxpreps'> = ['youtube', 'hudl', 'instagram', 'maxpreps'];

const formatHeight = (heightIn?: number) => {
  if (!heightIn) return '—';
  const feet = Math.floor(heightIn / 12);
  const inches = heightIn % 12;
  return `${feet}'${inches}"`;
};

export const PublicAthleteProfilePage = () => {
  const { handle = 'athlete' } = useParams<{ handle: string }>();
  const toast = useToast();
  const { profile } = useRecruitingProfile();

  const publicHandle = profile.athlete.twitterHandle?.replace('@', '') || 'athlete';
  const isOwnPage = handle === publicHandle;

  useEffect(() => {
    if (!isOwnPage) {
      document.title = 'Athlete profile unavailable';
      return;
    }
    const name = profile.athlete.name ?? 'Recruiting Athlete';
    document.title = `${name} | Coach Core Recruiting Profile`;

    const meta = document.querySelector('meta[name="description"]');
    const summary = `${name} • ${profile.athlete.positionPrimary ?? 'Athlete'} • Class of ${
      profile.athlete.gradYear ?? ''
    }`;
    if (meta) {
      meta.setAttribute('content', summary);
    } else {
      const descriptionTag = document.createElement('meta');
      descriptionTag.name = 'description';
      descriptionTag.content = summary;
      document.head.appendChild(descriptionTag);
    }
  }, [isOwnPage, profile.athlete.name, profile.athlete.positionPrimary, profile.athlete.gradYear, publicHandle]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/u/${publicHandle}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Public link copied', status: 'success' });
    } catch (error) {
      toast({ title: 'Unable to copy link', description: String(error), status: 'error' });
    }
  };

  const badges = useMemo(
    () =>
      providerOrder
        .filter((provider) => profile.linkedAccounts[provider].status !== 'not_linked')
        .map((provider) => (
          <Badge key={provider} colorScheme="purple" variant="subtle">
            {provider.toUpperCase()}
          </Badge>
        )),
    [profile.linkedAccounts]
  );

  if (!isOwnPage) {
    return (
      <VStack align="center" spacing={6} py={20}>
        <Heading size="md">We couldn’t find that athlete yet.</Heading>
        <Text color="gray.600">Ask them to share their latest recruiting page link.</Text>
      </VStack>
    );
  }

  const academicsVisible = profile.privacy.academics;
  const contactVisible = profile.privacy.contact;

  return (
    <VStack align="stretch" spacing={6}>
      <Box textAlign="center" borderWidth="1px" borderRadius="lg" padding={6} bg="white" shadow="sm">
        <VStack spacing={4}>
          <Avatar size="xl" name={profile.athlete.name ?? publicHandle} />
          <Heading size="lg" textTransform="capitalize">
            {profile.athlete.name ?? publicHandle}
          </Heading>
          <HStack spacing={3} wrap="wrap" justify="center">
            <Badge colorScheme="blue">Class of {profile.athlete.gradYear ?? '—'}</Badge>
            <Badge colorScheme="purple">{profile.athlete.positionPrimary ?? 'Athlete'}</Badge>
            {badges}
          </HStack>
          <HStack spacing={4} mt={3} justify="center">
            <StatBlock label="Height" value={formatHeight(profile.athlete.heightIn)} />
            <StatBlock
              label="Weight"
              value={profile.athlete.weightLb ? `${profile.athlete.weightLb} lbs` : '—'}
            />
            <StatBlock label="40 yd" value={profile.athlete.measurables?.forty ? `${profile.athlete.measurables.forty.toFixed(2)}s` : '—'} />
          </HStack>
          {profile.athlete.tags && profile.athlete.tags.length > 0 && (
            <HStack spacing={2} wrap="wrap" justify="center">
              {profile.athlete.tags.map((tag) => (
                <Badge key={tag} colorScheme="gray" variant="subtle">
                  #{tag}
                </Badge>
              ))}
            </HStack>
          )}
          <HStack spacing={3} justify="center">
            <Button leftIcon={<Share2 size={16} />} onClick={handleCopyLink}>
              Copy link
            </Button>
            <Link href={`mailto:${profile.athlete.twitterHandle ?? ''}`} color="blue.500" fontSize="sm">
              Contact via DM
            </Link>
          </HStack>
        </VStack>
      </Box>

      <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
        <GridItem>
          <VStack spacing={6} align="stretch">
            {profile.athlete.bio && (
              <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="sm">
                <Heading size="sm" mb={2}>
                  About
                </Heading>
                <Text fontSize="sm" color="gray.700">
                  {profile.athlete.bio}
                </Text>
              </Box>
            )}

            <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="sm">
              <Heading size="sm" mb={3}>
                Highlights
              </Heading>
              <AssetGrid assets={profile.assets.slice(0, 6)} emptyState="Highlights will appear here once linked." />
            </Box>
          </VStack>
        </GridItem>
        <GridItem>
          <VStack spacing={4} align="stretch">
            <ReadinessScoreCard
              score={profile.readinessScore}
              summary="Readiness blends academics, measurables, and media cadence."
            />
            {academicsVisible && (
              <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="sm">
                <Heading size="sm" mb={2}>
                  Academics
                </Heading>
                <Stack spacing={2} fontSize="sm" color="gray.700">
                  <Text>GPA: {profile.athlete.gpa ?? '—'}</Text>
                  <Text>ACT: {profile.athlete.act ?? '—'}</Text>
                  <Text>SAT: {profile.athlete.sat ?? '—'}</Text>
                  {profile.athlete.transcriptUrl && (
                    <Link href={profile.athlete.transcriptUrl} color="blue.500" isExternal>
                      View transcript
                    </Link>
                  )}
                </Stack>
              </Box>
            )}
            {contactVisible && (
              <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="sm">
                <Heading size="sm" mb={2}>
                  Contact
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  DM @{publicHandle} on Twitter for contact details.
                </Text>
              </Box>
            )}
            <Box borderWidth="1px" borderRadius="lg" padding={5} bg="white" shadow="sm">
              <Heading size="sm" mb={2}>
                Social & Video
              </Heading>
              <Stack spacing={2} fontSize="sm" color="blue.500">
                {profile.athlete.youtubeUrl && (
                  <Link href={profile.athlete.youtubeUrl} isExternal>
                    YouTube Channel
                  </Link>
                )}
                {profile.athlete.hudlUrl && (
                  <Link href={profile.athlete.hudlUrl} isExternal>
                    Hudl Highlights
                  </Link>
                )}
                {profile.athlete.instagramUrl && (
                  <Link href={profile.athlete.instagramUrl} isExternal>
                    Instagram
                  </Link>
                )}
                {profile.athlete.maxPrepsUrl && (
                  <Link href={profile.athlete.maxPrepsUrl} isExternal>
                    MaxPreps Stats
                  </Link>
                )}
              </Stack>
            </Box>
          </VStack>
        </GridItem>
      </Grid>
    </VStack>
  );
};

export default PublicAthleteProfilePage;
