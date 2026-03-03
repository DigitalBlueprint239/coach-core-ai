import { NavLink, Outlet } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
  VStack,
  Badge,
} from '@chakra-ui/react';
import { RecruitingFeatureGate } from '@/features/recruiting/components';

const navLinks = [
  { to: '/recruiting', label: 'Hub Home' },
  { to: '/recruiting/profile', label: 'Profile Builder' },
  { to: '/recruiting/highlights', label: 'Highlights' },
  { to: '/recruiting/opportunities', label: 'Opportunities' },
];

const staffLinks = [
  { to: '/discover', label: 'Discover Athletes' },
  { to: '/programs/portal', label: 'Program Portal' },
];

const navStyles = {
  paddingY: 2,
  paddingX: 3,
  borderRadius: 'md',
  fontWeight: 600,
};

const ActiveLink = ({ to, label }: { to: string; label: string }) => (
  <NavLink to={to} style={{ textDecoration: 'none' }}>
    {({ isActive }) => (
      <Link
        {...navStyles}
        display="block"
        bg={isActive ? 'blue.600' : 'transparent'}
        color={isActive ? 'white' : 'gray.700'}
        _hover={{ textDecoration: 'none', bg: isActive ? 'blue.700' : 'gray.100' }}
      >
        {label}
      </Link>
    )}
  </NavLink>
);

export const RecruitingLayout = () => (
  <RecruitingFeatureGate fallbackPath="/">
    <Flex direction={{ base: 'column', lg: 'row' }} gap={6} w="100%" minH="100%">
      <Box w={{ base: '100%', lg: '280px' }} flexShrink={0}>
        <Box
          borderWidth="1px"
          borderRadius="lg"
          padding={6}
          bg="white"
          shadow="sm"
        >
          <VStack align="stretch" spacing={6}>
            <Box>
              <Heading size="md" mb={1}>
                Recruiting Hub
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Build your profile, share highlights, and track opportunities.
              </Text>
            </Box>

            <Stack spacing={2}>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
                color="gray.500"
                letterSpacing="wider"
              >
                Athlete
              </Text>
              {navLinks.map((link) => (
                <ActiveLink key={link.to} {...link} />
              ))}
            </Stack>

            <Stack spacing={2}>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
                color="gray.500"
                letterSpacing="wider"
              >
                Coaches & Programs{' '}
                <Badge ml={2} colorScheme="purple">
                  Beta
                </Badge>
              </Text>
              {staffLinks.map((link) => (
                <ActiveLink key={link.to} {...link} />
              ))}
            </Stack>
          </VStack>
        </Box>
      </Box>

      <Box flex="1" minH="70vh">
        <Outlet />
      </Box>
    </Flex>
  </RecruitingFeatureGate>
);

export default RecruitingLayout;
