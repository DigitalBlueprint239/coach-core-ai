import React, { useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Text,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  FormControl,
  FormLabel,
  Select,
  useDisclosure,
  Box,
  Flex,
  IconButton,
  Icon,
} from '@chakra-ui/react';
import { ChevronDown, User, Settings, LogOut, Shield, Users, Edit, Crown } from 'lucide-react';
import authService, { UserProfile } from '../../services/firebase/auth-service';

interface UserProfileProps {
  profile: UserProfile;
}

const UserProfileComponent: React.FC<UserProfileProps> = ({ profile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const cardBg = useColorModeValue('gray.50', 'gray.700');

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      toast({
        title: 'Signed out successfully',
        description: 'Come back soon!',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error signing out',
        description: 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditProfile = () => {
    setEditedProfile(profile);
    setIsEditing(false);
    onEditModalOpen();
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    
    try {
      await authService.updateUserProfile(editedProfile);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      onEditModalClose();
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update profile. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'head-coach': return 'blue';
      case 'assistant-coach': return 'green';
      case 'admin': return 'purple';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'head-coach': return 'Head Coach';
      case 'assistant-coach': return 'Assistant Coach';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'head-coach': return Crown;
      case 'assistant-coach': return Users;
      case 'admin': return Shield;
      default: return User;
    }
  };

  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          variant="ghost"
          rightIcon={<ChevronDown />}
          leftIcon={
            <Avatar
              size="sm"
              name={profile.displayName}
              src={profile.profileImage}
              bg="linear-gradient(135deg, blue.500 0%, purple.600 100%)"
              color="white"
              shadow="md"
            />
          }
          _hover={{ 
            bg: 'gray.100',
            transform: 'translateY(-1px)',
            boxShadow: 'md',
          }}
          _active={{ 
            bg: 'gray.200',
            transform: 'translateY(0)',
          }}
          transition="all 0.2s"
          borderRadius="xl"
          px={4}
          py={2}
        >
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
              {profile.displayName}
            </Text>
            <HStack spacing={1}>
              <Badge 
                size="sm" 
                colorScheme={getRoleColor(profile.role)}
                variant="subtle"
                borderRadius="full"
                px={2}
              >
                <Icon as={getRoleIcon(profile.role)} boxSize={3} mr={1} />
                {getRoleLabel(profile.role)}
              </Badge>
            </HStack>
          </VStack>
        </MenuButton>
        
        <MenuList 
          bg={bgColor} 
          borderColor={borderColor}
          borderRadius="xl"
          shadow="xl"
          py={2}
        >
          <MenuItem 
            icon={<Icon as={User} boxSize={4} />} 
            onClick={handleEditProfile}
            borderRadius="lg"
            mx={2}
            _hover={{ bg: 'blue.50' }}
          >
            Edit Profile
          </MenuItem>
          
          <MenuItem 
            icon={<Icon as={Users} boxSize={4} />}
            borderRadius="lg"
            mx={2}
            _hover={{ bg: 'blue.50' }}
          >
            Team Settings
          </MenuItem>
          
          <MenuItem 
            icon={<Icon as={Shield} boxSize={4} />}
            borderRadius="lg"
            mx={2}
            _hover={{ bg: 'blue.50' }}
          >
            Account Settings
          </MenuItem>
          
          <MenuDivider />
          
          <MenuItem 
            icon={<Icon as={LogOut} boxSize={4} />} 
            onClick={handleSignOut}
            borderRadius="lg"
            mx={2}
            _hover={{ bg: 'red.50' }}
            color="red.600"
          >
            Sign Out
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="lg">
        <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.300" />
        <ModalContent 
          bg={bgColor} 
          borderRadius="2xl" 
          shadow="2xl"
          border="1px"
          borderColor={borderColor}
        >
          <ModalHeader>
            <Flex align="center">
              <Box
                w={10}
                h={10}
                bg="linear-gradient(135deg, blue.500 0%, purple.600 100%)"
                borderRadius="xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mr={3}
              >
                <Icon as={User} boxSize={5} color="white" />
              </Box>
              <Text>Edit Profile</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Flex justify="space-between" align="center" p={4} bg={cardBg} borderRadius="xl">
                <Box>
                  <Text fontSize="lg" fontWeight="bold" color="gray.800">
                    {profile.displayName}
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {profile.teamName}
                  </Text>
                </Box>
                <Badge 
                  colorScheme={getRoleColor(profile.role)} 
                  size="lg"
                  borderRadius="full"
                  px={3}
                  py={1}
                >
                  <Icon as={getRoleIcon(profile.role)} boxSize={4} mr={2} />
                  {getRoleLabel(profile.role)}
                </Badge>
              </Flex>
              
              <FormControl>
                <FormLabel fontWeight="semibold" color="gray.700">Display Name</FormLabel>
                <Input
                  value={editedProfile.displayName}
                  onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                  placeholder="Enter your display name"
                  size="lg"
                  borderRadius="xl"
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                  _hover={{
                    borderColor: 'gray.300',
                  }}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel fontWeight="semibold" color="gray.700">Phone Number</FormLabel>
                <Input
                  value={editedProfile.phoneNumber || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, phoneNumber: e.target.value })}
                  placeholder="Enter your phone number"
                  size="lg"
                  borderRadius="xl"
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                  _hover={{
                    borderColor: 'gray.300',
                  }}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel fontWeight="semibold" color="gray.700">Role</FormLabel>
                <Select
                  value={editedProfile.role}
                  onChange={(e) => setEditedProfile({ ...editedProfile, role: e.target.value as any })}
                  isDisabled={profile.role === 'head-coach'}
                  size="lg"
                  borderRadius="xl"
                  border="2px"
                  borderColor="gray.200"
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                >
                  <option value="head-coach">👑 Head Coach</option>
                  <option value="assistant-coach">👥 Assistant Coach</option>
                  <option value="admin">🛡️ Administrator</option>
                </Select>
                {profile.role === 'head-coach' && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Head coach role cannot be changed
                  </Text>
                )}
              </FormControl>
              
              <Box p={4} bg={cardBg} borderRadius="xl">
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                  Team Information
                </Text>
                <VStack spacing={2} align="start">
                  <HStack>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      Team:
                    </Text>
                    <Text fontSize="sm" color="gray.800">
                      {profile.teamName}
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      Member since:
                    </Text>
                    <Text fontSize="sm" color="gray.800">
                      {profile.createdAt.toLocaleDateString()}
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                      Last login:
                    </Text>
                    <Text fontSize="sm" color="gray.800">
                      {profile.lastLogin.toLocaleDateString()}
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditModalClose} borderRadius="xl">
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveProfile}
              isLoading={isLoading}
              loadingText="Saving..."
              borderRadius="xl"
              bg="linear-gradient(135deg, blue.500 0%, purple.600 100%)"
              _hover={{
                transform: 'translateY(-1px)',
                boxShadow: 'md',
              }}
              _active={{
                transform: 'translateY(0)',
              }}
              transition="all 0.2s"
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UserProfileComponent;
