import React, { useState } from 'react';
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
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Badge,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { 
  FiMenu, 
  FiX, 
  FiUser, 
  FiSettings, 
  FiLogOut, 
  FiBell,
  FiHome,
  FiBookOpen,
  FiBarChart3,
  FiUsers,
  FiHelpCircle
} from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../../services/firebase';

interface HeaderProps {
  user?: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  } | null;
  onLogin: () => void;
  onSignup: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogin, onSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { isOpen: isMobileMenuOpen, onOpen: onMobileMenuOpen, onClose: onMobileMenuClose } = useDisclosure();
  const location = useLocation();
  const toast = useToast();

  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: FiHome },
    { name: 'Smart Playbook', path: '/playbook', icon: FiBookOpen },
    { name: 'Analytics', path: '/analytics', icon: FiBarChart3 },
    { name: 'Coaches', path: '/coaches', icon: FiUsers },
  ];

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Sign Out Failed',
        description: 'Unable to sign out. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      <Box
        as="header"
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        position="sticky"
        top={0}
        zIndex={1000}
      >
        <Flex
          maxW="7xl"
          mx="auto"
          px={{ base: 4, md: 6 }}
          py={4}
          align="center"
          justify="space-between"
        >
          {/* Logo and Brand */}
          <Flex align="center" flex={1}>
            <Link to="/">
              <HStack spacing={3} cursor="pointer">
                <Box
                  w={8}
                  h={8}
                  bg="brand.500"
                  borderRadius="lg"
                  display="flex"
                  align="center"
                  justify="center"
                >
                  <Text color="white" fontWeight="bold" fontSize="sm">
                    CC
                  </Text>
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg" color="brand.600">
                    Coach Core
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    AI-Powered Coaching
                  </Text>
                </VStack>
              </HStack>
            </Link>
          </Flex>

          {/* Desktop Navigation */}
          <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
            {navigationItems.map((item) => (
              <Link key={item.name} to={item.path}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<item.icon />}
                  color={isActivePath(item.path) ? 'brand.500' : 'gray.600'}
                  fontWeight={isActivePath(item.path) ? 'semibold' : 'normal'}
                  _hover={{
                    bg: isActivePath(item.path) ? 'brand.50' : 'gray.50',
                  }}
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </HStack>

          {/* User Menu / Auth Buttons */}
          <HStack spacing={4}>
            {user ? (
              <>
                {/* Notifications */}
                <IconButton
                  aria-label="Notifications"
                  icon={<FiBell />}
                  variant="ghost"
                  size="sm"
                  position="relative"
                >
                  <Badge
                    position="absolute"
                    top={1}
                    right={1}
                    colorScheme="red"
                    size="sm"
                    borderRadius="full"
                    fontSize="xs"
                  >
                    3
                  </Badge>
                </IconButton>

                {/* User Menu */}
                <Menu>
                  <MenuButton
                    as={Button}
                    variant="ghost"
                    size="sm"
                    px={3}
                    py={2}
                    borderRadius="lg"
                    _hover={{ bg: 'gray.50' }}
                  >
                    <HStack spacing={3}>
                      <Avatar
                        size="sm"
                        name={user.displayName || user.email}
                        src={user.photoURL || undefined}
                      />
                      <VStack align="start" spacing={0} display={{ base: 'none', lg: 'flex' }}>
                        <Text fontSize="sm" fontWeight="medium">
                          {user.displayName || 'Coach'}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {user.email}
                        </Text>
                      </VStack>
                    </HStack>
                  </MenuButton>
                  <MenuList>
                    <MenuItem icon={<FiUser />}>
                      Profile
                    </MenuItem>
                    <MenuItem icon={<FiSettings />}>
                      Settings
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem 
                      icon={<FiLogOut />}
                      onClick={handleSignOut}
                      isLoading={isLoading}
                    >
                      Sign Out
                    </MenuItem>
                  </MenuList>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogin}
                  display={{ base: 'none', md: 'flex' }}
                >
                  Sign In
                </Button>
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={onSignup}
                  display={{ base: 'none', md: 'flex' }}
                >
                  Get Started
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <IconButton
              aria-label="Open menu"
              icon={isMobileMenuOpen ? <FiX /> : <FiMenu />}
              variant="ghost"
              size="sm"
              display={{ base: 'flex', md: 'none' }}
              onClick={onMobileMenuOpen}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Navigation Drawer */}
      <Drawer isOpen={isMobileMenuOpen} placement="right" onClose={onMobileMenuClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <HStack spacing={3}>
              <Box
                w={6}
                h={6}
                bg="brand.500"
                borderRadius="md"
                display="flex"
                align="center"
                justify="center"
              >
                <Text color="white" fontWeight="bold" fontSize="xs">
                  CC
                </Text>
              </Box>
              <Text fontWeight="bold">Coach Core</Text>
            </HStack>
          </DrawerHeader>
          <DrawerBody p={0}>
            <VStack spacing={0} align="stretch">
              {navigationItems.map((item) => (
                <Link key={item.name} to={item.path} onClick={onMobileMenuClose}>
                  <Button
                    variant="ghost"
                    size="lg"
                    leftIcon={<item.icon />}
                    justifyContent="start"
                    w="full"
                    borderRadius={0}
                    color={isActivePath(item.path) ? 'brand.500' : 'gray.600'}
                    bg={isActivePath(item.path) ? 'brand.50' : 'transparent'}
                    _hover={{
                      bg: isActivePath(item.path) ? 'brand.100' : 'gray.50',
                    }}
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
              
              <Box p={4}>
                <Divider mb={4} />
                
                {user ? (
                  <VStack spacing={3} align="stretch">
                    <HStack spacing={3}>
                      <Avatar
                        size="sm"
                        name={user.displayName || user.email}
                        src={user.photoURL || undefined}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          {user.displayName || 'Coach'}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {user.email}
                        </Text>
                      </VStack>
                    </HStack>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<FiUser />}
                      justifyContent="start"
                    >
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<FiSettings />}
                      justifyContent="start"
                    >
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<FiLogOut />}
                      justifyContent="start"
                      onClick={handleSignOut}
                      isLoading={isLoading}
                    >
                      Sign Out
                    </Button>
                  </VStack>
                ) : (
                  <VStack spacing={3} align="stretch">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onLogin();
                        onMobileMenuClose();
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => {
                        onSignup();
                        onMobileMenuClose();
                      }}
                    >
                      Get Started
                    </Button>
                  </VStack>
                )}
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default Header; 