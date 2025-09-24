// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  useColorModeValue,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Collapse,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  Menu as MenuIcon,
  X,
  Home,
  Users,
  BookOpen,
  Play,
  Brain,
  BarChart3,
  Calendar,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  User,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  MessageCircle,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import FeedbackModal from '../Feedback/FeedbackModal';

// Navigation item component
const NavItem = ({ icon, label, href, isActive, onClick, badge }: any) => {
  const activeColor = useColorModeValue('brand.500', 'brand.300');
  const hoverBg = useColorModeValue('brand.50', 'brand.900');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const activeTextColor = useColorModeValue('brand.600', 'brand.200');

  return (
    <Button
      as={Link}
      to={href}
      onClick={onClick}
      variant="ghost"
      size="lg"
      justifyContent="flex-start"
      leftIcon={<Icon as={icon} boxSize={5} />}
      color={isActive ? activeTextColor : textColor}
      bg={isActive ? hoverBg : 'transparent'}
      fontWeight={isActive ? '600' : '500'}
      borderRadius="xl"
      px={4}
      py={3}
      h="auto"
      minH="48px"
      position="relative"
      _hover={{
        bg: hoverBg,
        color: activeTextColor,
        transform: 'translateX(4px)',
      }}
      transition="all 0.2s ease-in-out"
      rightIcon={badge ? (
        <Badge
          colorScheme="red"
          borderRadius="full"
          fontSize="xs"
          minW="20px"
          h="20px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {badge}
        </Badge>
      ) : undefined}
    >
      {label}
    </Button>
  );
};

// Mobile navigation item
const MobileNavItem = ({ icon, label, href, isActive, onClick, badge }: any) => {
  const activeColor = useColorModeValue('brand.500', 'brand.300');
  const hoverBg = useColorModeValue('brand.50', 'brand.900');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const activeTextColor = useColorModeValue('brand.600', 'brand.200');

  return (
    <Button
      as={Link}
      to={href}
      onClick={onClick}
      variant="ghost"
      size="lg"
      justifyContent="flex-start"
      leftIcon={<Icon as={icon} boxSize={5} />}
      color={isActive ? activeTextColor : textColor}
      bg={isActive ? hoverBg : 'transparent'}
      fontWeight={isActive ? '600' : '500'}
      borderRadius="xl"
      px={4}
      py={3}
      h="auto"
      minH="48px"
      w="full"
      _hover={{
        bg: hoverBg,
        color: activeTextColor,
      }}
      rightIcon={badge ? (
        <Badge
          colorScheme="red"
          borderRadius="full"
          fontSize="xs"
          minW="20px"
          h="20px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {badge}
        </Badge>
      ) : undefined}
    >
      {label}
    </Button>
  );
};

// User menu component
const UserMenu = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const menuBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        variant="ghost"
        p={0}
        h="auto"
        minW="auto"
        _hover={{ bg: 'transparent' }}
        _active={{ bg: 'transparent' }}
      >
        <HStack spacing={3}>
          <Avatar
            size="sm"
            name={profile?.displayName || user?.email}
            src={profile?.photoURL}
            bg="brand.500"
            color="white"
          />
          <VStack align="start" spacing={0} display={{ base: 'none', md: 'flex' }}>
            <Text fontSize="sm" fontWeight="600" color="gray.900">
              {profile?.displayName || 'Coach'}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {profile?.role || 'Head Coach'}
            </Text>
          </VStack>
          <Icon as={ChevronDown} boxSize={4} color="gray.500" />
        </HStack>
      </MenuButton>
      <MenuList
        bg={menuBg}
        borderColor={borderColor}
        borderRadius="xl"
        boxShadow="xl"
        py={2}
        minW="200px"
      >
        <MenuItem
          icon={<Icon as={User} boxSize={4} />}
          onClick={() => navigate('/profile')}
          borderRadius="lg"
          mx={2}
        >
          Profile
        </MenuItem>
        <MenuItem
          icon={<Icon as={Settings} boxSize={4} />}
          onClick={() => navigate('/settings')}
          borderRadius="lg"
          mx={2}
        >
          Settings
        </MenuItem>
        <MenuItem
          icon={<Icon as={Shield} boxSize={4} />}
          onClick={() => navigate('/privacy')}
          borderRadius="lg"
          mx={2}
        >
          Privacy
        </MenuItem>
        <MenuItem
          icon={<Icon as={HelpCircle} boxSize={4} />}
          onClick={() => navigate('/help')}
          borderRadius="lg"
          mx={2}
        >
          Help & Support
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon={<Icon as={LogOut} boxSize={4} />}
          onClick={handleLogout}
          color="red.500"
          borderRadius="lg"
          mx={2}
        >
          Sign Out
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

// Main navigation component
const ModernNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
  // Check if we're in staging environment
  const isStaging = import.meta.env.VITE_ENVIRONMENT === 'staging' || 
                   window.location.hostname.includes('staging');
  
  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const shadowColor = useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.3)');
  
  // Navigation items
  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Team', href: '/team' },
    { icon: BookOpen, label: 'Practice', href: '/practice' },
    { icon: Play, label: 'Plays', href: '/play-designer' },
    { icon: Calendar, label: 'Games', href: '/games' },
    { icon: Brain, label: 'AI Brain', href: '/ai-brain' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if item is active
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <Box
        as="nav"
        position="sticky"
        top={0}
        zIndex={1000}
        borderBottom="1px solid"
        borderColor={borderColor}
        backdropFilter="blur(10px)"
        bg={isScrolled ? `${bgColor}CC` : bgColor}
        transition="all 0.2s ease-in-out"
        boxShadow={isScrolled ? `0 4px 6px -1px ${shadowColor}` : 'none'}
      >
        <Box maxW="7xl" mx="auto" px={4}>
          <Flex h={16} align="center" justify="space-between">
            {/* Logo */}
            <HStack spacing={4}>
              <Button
                as={Link}
                to="/dashboard"
                variant="ghost"
                fontSize="xl"
                fontWeight="bold"
                color="brand.500"
                _hover={{ color: 'brand.600' }}
              >
                Coach Core AI
              </Button>
            </HStack>

            {/* Desktop Navigation Items */}
            <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  isActive={isActive(item.href)}
                />
              ))}
            </HStack>

            {/* Right Side Actions */}
            <HStack spacing={3}>
              {/* Search */}
              <InputGroup maxW="300px" display={{ base: 'none', lg: 'flex' }}>
                <InputLeftElement>
                  <Icon as={Search} boxSize={4} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search..."
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'brand.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                  }}
                />
              </InputGroup>

              {/* Notifications */}
              <Tooltip label="Notifications" placement="bottom">
                <IconButton
                  aria-label="Notifications"
                  icon={<Icon as={Bell} boxSize={5} />}
                  variant="ghost"
                  size="lg"
                  position="relative"
                >
                  <Badge
                    position="absolute"
                    top={1}
                    right={1}
                    colorScheme="red"
                    borderRadius="full"
                    fontSize="xs"
                    minW="18px"
                    h="18px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    3
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Staging Feedback Button */}
              {isStaging && (
                <Tooltip label="Submit Feedback" placement="bottom">
                  <Button
                    leftIcon={<Icon as={MessageCircle} boxSize={4} />}
                    colorScheme="blue"
                    variant="solid"
                    size="sm"
                    onClick={() => setIsFeedbackOpen(true)}
                    borderRadius="xl"
                    fontWeight="500"
                  >
                    Feedback
                  </Button>
                </Tooltip>
              )}

              {/* User Menu */}
              <UserMenu />

              {/* Mobile Menu Button */}
              <IconButton
                aria-label="Open menu"
                icon={<Icon as={MenuIcon} />}
                variant="ghost"
                size="lg"
                display={{ base: 'flex', md: 'none' }}
                onClick={onOpen}
              />
            </HStack>
          </Flex>
        </Box>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer isOpen={isOpen} onClose={onClose} placement="left" size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <Text fontSize="xl" fontWeight="bold" color="brand.500">
              Coach Core AI
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={2} align="stretch">
              {/* Mobile Search */}
              <InputGroup>
                <InputLeftElement>
                  <Icon as={Search} boxSize={4} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search..."
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                />
              </InputGroup>

              <Divider />

              {/* Mobile Navigation Items */}
              <VStack spacing={1} align="stretch">
                {navItems.map((item) => (
                  <MobileNavItem
                    key={item.href}
                    {...item}
                    isActive={isActive(item.href)}
                    onClick={onClose}
                  />
                ))}
              </VStack>

              <Divider />

              {/* Mobile User Menu */}
              <VStack spacing={1} align="stretch">
                <MobileNavItem
                  icon={User}
                  label="Profile"
                  href="/profile"
                  isActive={isActive('/profile')}
                  onClick={onClose}
                />
                <MobileNavItem
                  icon={Settings}
                  label="Settings"
                  href="/settings"
                  isActive={isActive('/settings')}
                  onClick={onClose}
                />
                <MobileNavItem
                  icon={HelpCircle}
                  label="Help & Support"
                  href="/help"
                  isActive={isActive('/help')}
                  onClick={onClose}
                />
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </>
  );
};

export default ModernNavigation;