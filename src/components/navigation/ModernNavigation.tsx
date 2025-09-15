import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  IconButton,
  Avatar,
  AvatarBadge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerContent,
  DrawerCloseButton,
  Badge,
  Divider,
  useToast,
  Tooltip,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useBreakpointValue,
  Icon,
  Flex,
} from '@chakra-ui/react';
import {
  Menu as MenuIcon,
  Home,
  Users,
  Calendar,
  Brain,
  Settings,
  LogOut,
  User,
  Bell,
  Search,
  ChevronRight,
  Trophy,
  Target,
  BarChart3,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Sun,
  Moon,
  Play,
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../services/state/app-store';
import { authService } from '../../services/firebase/auth-service';

const ModernNavigation: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const { user, currentTeam, setUser, clearStore } = useAppStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const brandColor = useColorModeValue('blue.600', 'blue.400');

  const isMobile = useBreakpointValue({ base: true, md: false });

  // Navigation items
  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: Home,
      description: 'Overview and analytics',
    },
    {
      name: 'Team',
      path: '/team',
      icon: Users,
      description: 'Player management and roster',
    },
    {
      name: 'Practice',
      path: '/practice',
      icon: Target,
      description: 'Practice planning and drills',
    },
    {
      name: 'Games',
      path: '/games',
      icon: Trophy,
      description: 'Game management and stats',
    },
    {
      name: 'AI Brain',
      path: '/ai-brain',
      icon: Brain,
      description: 'AI-powered coaching insights',
    },
    {
      name: 'AI Play Generator',
      path: '/ai-play-generator',
      icon: Play,
      description: 'Generate AI-powered football plays',
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      description: 'Performance metrics and reports',
    },
    {
      name: 'Playbook',
      path: '/playbook',
      icon: BookOpen,
      description: 'Team plays and strategies',
    },
    {
      name: 'Communication',
      path: '/communication',
      icon: MessageSquare,
      description: 'Team messaging and updates',
    },
    {
      name: 'Performance',
      path: '/performance',
      icon: BarChart3,
      description: 'App performance monitoring',
    },
  ];

  // Generate breadcrumbs based on current location
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', path: '/' }];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const name =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
      breadcrumbs.push({ name, path: currentPath });
    });

    return breadcrumbs;
  };

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await authService.signOut();
      clearStore();
      navigate('/');
      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of your account.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Sign out failed',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [clearStore, navigate, toast]);

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(
      item => item.path === location.pathname
    );
    return currentItem ? currentItem.name : 'Coach Core AI';
  };

  // Get current page description
  const getCurrentPageDescription = () => {
    const currentItem = navigationItems.find(
      item => item.path === location.pathname
    );
    return currentItem
      ? currentItem.description
      : 'AI-powered youth football coaching platform';
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <Box
        as="nav"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        px={4}
        py={3}
        position="sticky"
        top={0}
        zIndex={1000}
        boxShadow="sm"
      >
        <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
          {/* Logo and Brand */}
          <HStack spacing={4}>
            <IconButton
              aria-label="Open navigation menu"
              icon={<MenuIcon />}
              variant="ghost"
              size="lg"
              onClick={onOpen}
              display={{ base: 'flex', md: 'none' }}
            />

            <Link to="/">
              <HStack spacing={3} cursor="pointer">
                <Box
                  w={10}
                  h={10}
                  bg={brandColor}
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="lg"
                >
                  <Text color="white" fontWeight="bold" fontSize="lg">
                    CC
                  </Text>
                </Box>
                <VStack spacing={0} align="start">
                  <Heading size="md" color={brandColor}>
                    Coach Core
                  </Heading>
                  <Text fontSize="xs" color="gray.500" fontWeight="medium">
                    AI-Powered Youth Football
                  </Text>
                </VStack>
              </HStack>
            </Link>
          </HStack>

          {/* Desktop Navigation */}
          <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
            {navigationItems.map(item => (
              <Tooltip
                key={item.path}
                label={item.description}
                placement="bottom"
              >
                <Link to={item.path}>
                  <Button
                    variant={
                      location.pathname === item.path ? 'solid' : 'ghost'
                    }
                    colorScheme={
                      location.pathname === item.path ? 'blue' : 'gray'
                    }
                    size="sm"
                    leftIcon={<item.icon size={16} />}
                    _hover={{
                      bg:
                        location.pathname === item.path
                          ? 'blue.600'
                          : 'gray.100',
                    }}
                  >
                    {item.name}
                  </Button>
                </Link>
              </Tooltip>
            ))}
          </HStack>

          {/* User Profile and Actions */}
          <HStack spacing={3}>
            {/* Notifications */}
            <Tooltip label="Notifications">
              <IconButton
                aria-label="Notifications"
                icon={<Bell size={18} />}
                variant="ghost"
                size="sm"
                color="gray.600"
                _hover={{ bg: 'gray.100' }}
              />
            </Tooltip>

            {/* Search */}
            <Tooltip label="Search">
              <IconButton
                aria-label="Search"
                icon={<Search size={18} />}
                variant="ghost"
                size="sm"
                color="gray.600"
                _hover={{ bg: 'gray.100' }}
              />
            </Tooltip>

            {/* User Menu */}
            <Menu>
              <MenuButton
                as={Button}
                variant="ghost"
                size="sm"
                px={3}
                py={2}
                _hover={{ bg: 'gray.100' }}
              >
                <HStack spacing={3}>
                  <Avatar
                    size="sm"
                    name={user?.displayName || 'Coach'}
                    src={user?.photoURL || undefined}
                  >
                    {user?.role === 'head-coach' && (
                      <AvatarBadge boxSize="1em" bg="green.500" />
                    )}
                  </Avatar>
                  <VStack
                    spacing={0}
                    align="start"
                    display={{ base: 'none', lg: 'flex' }}
                  >
                    <Text fontSize="sm" fontWeight="medium" color={textColor}>
                      {user?.displayName || 'Coach'}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {user?.role
                        ?.replace('-', ' ')
                        .replace(/\b\w/g, l => l.toUpperCase()) || 'Coach'}
                    </Text>
                  </VStack>
                </HStack>
              </MenuButton>

              <MenuList>
                <MenuItem
                  icon={<User size={16} />}
                  onClick={() => setIsProfileOpen(true)}
                >
                  Profile Settings
                </MenuItem>
                <MenuItem icon={<Settings size={16} />}>App Settings</MenuItem>
                <MenuDivider />
                <MenuItem icon={<HelpCircle size={16} />}>
                  Help & Support
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<LogOut size={16} />}
                  onClick={handleSignOut}
                  color="red.600"
                >
                  Sign Out
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>

      {/* Breadcrumbs */}
      <Box
        bg="gray.50"
        borderBottom="1px"
        borderColor="gray.200"
        px={4}
        py={2}
        display={{ base: 'none', md: 'block' }}
      >
        <Box maxW="7xl" mx="auto">
          <Breadcrumb
            spacing="8px"
            separator={<ChevronRight size={12} color="gray.400" />}
            fontSize="sm"
          >
            {generateBreadcrumbs().map((breadcrumb, index) => (
              <BreadcrumbItem
                key={breadcrumb.path}
                isCurrentPage={index === generateBreadcrumbs().length - 1}
              >
                <BreadcrumbLink
                  as={Link}
                  to={breadcrumb.path}
                  color={
                    index === generateBreadcrumbs().length - 1
                      ? 'gray.800'
                      : 'gray.600'
                  }
                  fontWeight={
                    index === generateBreadcrumbs().length - 1
                      ? 'semibold'
                      : 'normal'
                  }
                  _hover={{ color: 'blue.600' }}
                >
                  {breadcrumb.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            ))}
          </Breadcrumb>
        </Box>
      </Box>

      {/* Page Header */}
      <Box
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        px={4}
        py={6}
        display={{ base: 'none', md: 'block' }}
      >
        <Box maxW="7xl" mx="auto">
          <VStack spacing={2} align="start">
            <Heading size="lg" color={textColor}>
              {getCurrentPageTitle()}
            </Heading>
            <Text color="gray.600" fontSize="md">
              {getCurrentPageDescription()}
            </Text>
            {currentTeam && (
              <HStack spacing={3}>
                <Badge colorScheme="blue" variant="subtle" fontSize="sm">
                  {currentTeam.name}
                </Badge>
                <Badge colorScheme="green" variant="subtle" fontSize="sm">
                  {currentTeam.sport}
                </Badge>
                <Badge colorScheme="purple" variant="subtle" fontSize="sm">
                  {currentTeam.ageGroup}
                </Badge>
              </HStack>
            )}
          </VStack>
        </Box>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        {/* <DrawerOverlay /> */}
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <HStack spacing={3}>
              <Box
                w={8}
                h={8}
                bg={brandColor}
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="white" fontWeight="bold" fontSize="sm">
                  CC
                </Text>
              </Box>
              <Text fontWeight="bold">Coach Core</Text>
            </HStack>
          </DrawerHeader>

          <DrawerBody p={0}>
            <VStack spacing={0} align="stretch">
              {navigationItems.map(item => (
                <Link key={item.path} to={item.path} onClick={onClose}>
                  <Button
                    variant={
                      location.pathname === item.path ? 'solid' : 'ghost'
                    }
                    colorScheme={
                      location.pathname === item.path ? 'blue' : 'gray'
                    }
                    size="lg"
                    w="full"
                    justifyContent="start"
                    leftIcon={<item.icon size={18} />}
                    borderRadius={0}
                    _hover={{
                      bg:
                        location.pathname === item.path
                          ? 'blue.600'
                          : 'gray.100',
                    }}
                  >
                    <VStack spacing={1} align="start" flex={1}>
                      <Text fontWeight="medium">{item.name}</Text>
                      <Text fontSize="xs" color="gray.500" textAlign="left">
                        {item.description}
                      </Text>
                    </VStack>
                  </Button>
                </Link>
              ))}

              <Divider my={4} />

              <VStack spacing={2} p={4}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Team: {currentTeam?.name || 'No Team Selected'}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {user?.email}
                </Text>
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ModernNavigation;
