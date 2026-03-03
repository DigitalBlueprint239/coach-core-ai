import { Badge, Box, Grid, GridItem, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react';
import { Youtube, Film, Instagram, Trophy } from 'lucide-react';

export interface AssetGridItem {
  id: string;
  provider: 'youtube' | 'hudl' | 'instagram' | 'maxpreps' | 'twitter';
  title: string;
  url: string;
  thumbnail?: string;
  metrics?: {
    views?: number;
    likes?: number;
    timestamp?: string;
  };
}

export interface AssetGridProps {
  assets: AssetGridItem[];
  emptyState?: string;
}

const providerBadge: Record<AssetGridItem['provider'], { color: string; label: string; icon: typeof Youtube }> = {
  youtube: { color: 'red', label: 'YouTube', icon: Youtube },
  hudl: { color: 'orange', label: 'Hudl', icon: Film },
  instagram: { color: 'pink', label: 'Instagram', icon: Instagram },
  maxpreps: { color: 'blue', label: 'MaxPreps', icon: Trophy },
  twitter: { color: 'cyan', label: 'Twitter/X', icon: Trophy },
};

export const AssetGrid = ({ assets, emptyState = 'No media yet. Link accounts or add manual highlights.' }: AssetGridProps) => {
  if (!assets.length) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={6} textAlign="center" color="gray.500" bg="white" shadow="sm">
        {emptyState}
      </Box>
    );
  }

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap={4}>
      {assets.map((asset) => {
        const provider = providerBadge[asset.provider];
        return (
          <GridItem key={asset.id} borderWidth="1px" borderRadius="lg" bg="white" shadow="sm">
            <VStack align="stretch" spacing={3} p={4}>
              <HStack spacing={2}>
                <Badge colorScheme={provider.color} display="flex" alignItems="center" gap={1}>
                  <Icon as={provider.icon} boxSize={3} />
                  <Text fontSize="xs">{provider.label}</Text>
                </Badge>
                {asset.metrics?.timestamp && (
                  <Text fontSize="xs" color="gray.500">
                    {new Date(asset.metrics.timestamp).toLocaleDateString()}
                  </Text>
                )}
              </HStack>
              <Box>
                <Link href={asset.url} isExternal fontWeight="semibold" noOfLines={2}>
                  {asset.title}
                </Link>
                <HStack spacing={4} fontSize="xs" color="gray.500" mt={1}>
                  {asset.metrics?.views !== undefined && <Text>{asset.metrics.views.toLocaleString()} views</Text>}
                  {asset.metrics?.likes !== undefined && <Text>{asset.metrics.likes.toLocaleString()} likes</Text>}
                </HStack>
              </Box>
            </VStack>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export default AssetGrid;
