import { Box, Grid, GridItem, Heading, Link as ChakraLink, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { AssetGrid, ProfileCompletionMeter, ReadinessScoreCard } from '@/features/recruiting';
import useRecruitingProfile from '@/features/recruiting/hooks/useRecruitingProfile';

export const RecruitingHubHomePage = () => {
  const { profile, completion, saveStatus, nextActions } = useRecruitingProfile();

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="lg" mb={2}>
          Recruiting Intelligence Hub
        </Heading>
        <Text color="gray.600">
          Track your recruiting readiness, connect accounts, and keep coaches up to date from one place.
        </Text>
      </Box>

      <ProfileCompletionMeter
        completion={completion}
        readinessScore={profile.readinessScore}
        saveStatus={saveStatus}
        nextActions={nextActions}
        onViewPublicProfile={() => {
          window.open(`/u/${profile.athlete?.twitterHandle?.replace('@', '') ?? 'athlete'}`, '_blank');
        }}
      />

      <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={4}>
        <GridItem>
          <ReadinessScoreCard
            score={profile.readinessScore}
            summary="Mock readiness blends your academics, measurables, and media cadence."
            nextSteps={nextActions}
          />
        </GridItem>
        <GridItem>
          <VStack align="stretch" spacing={3} borderWidth="1px" borderRadius="lg" p={5} bg="white" shadow="sm">
            <Heading size="sm">Quick actions</Heading>
            <VStack align="stretch" spacing={2} fontSize="sm" color="blue.600">
              <ChakraLink as={RouterLink} to="/recruiting/profile">
                Update profile
              </ChakraLink>
              <ChakraLink as={RouterLink} to="/recruiting/highlights">
                Build new highlight
              </ChakraLink>
              <ChakraLink as={RouterLink} to="/recruiting/opportunities">
                Browse opportunities
              </ChakraLink>
            </VStack>
          </VStack>
        </GridItem>
      </Grid>

      <VStack align="stretch" spacing={3}>
        <Heading size="md">Latest media</Heading>
        <AssetGrid
          assets={profile.assets.map((asset) => ({
            id: asset.id,
            provider: asset.provider,
            title: asset.title,
            url: asset.url,
            metrics: asset.metrics,
          }))}
        />
      </VStack>
    </VStack>
  );
};

export default RecruitingHubHomePage;
