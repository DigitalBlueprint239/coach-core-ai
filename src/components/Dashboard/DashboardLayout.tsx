import React from 'react';
import { Box, Container, Flex, Heading, Stack, Text } from '@chakra-ui/react';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, subtitle, actions, children }) => {
  return (
    <Box bg="gray.50" minH="100vh" py={8} px={{ base: 4, md: 8 }}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={4}>
            <Stack spacing={2}>
              <Heading size="lg" color="gray.800">
                {title}
              </Heading>
              {subtitle ? (
                <Text color="gray.600" fontSize="md">
                  {subtitle}
                </Text>
              ) : null}
            </Stack>
            {actions ? <Box>{actions}</Box> : null}
          </Flex>

          <Box>{children}</Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default DashboardLayout;
