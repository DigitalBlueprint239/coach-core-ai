import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedPlayEditor } from '../EnhancedPlayEditor';
import { ConflictResolutionDialog } from '../ConflictResolutionDialog';
import { updatePlay, getPlays } from '../../../services/firestore';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
jest.mock('../../../services/firestore');
jest.mock('../../../hooks/useAuth');

const mockUpdatePlay = updatePlay as jest.MockedFunction<typeof updatePlay>;
const mockGetPlays = getPlays as jest.MockedFunction<typeof getPlays>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Conflict Resolution Tests', () => {
  const mockUser = { uid: 'user123', email: 'test@example.com' };
  const mockPlay = {
    id: 'play123',
    teamId: 'team123',
    name: 'Test Play',
    formation: '4-3-3',
    description: 'Test description',
    difficulty: 'beginner' as const,
    tags: ['test'],
    version: 1,
    lastModifiedBy: 'user123',
    lastModifiedAt: { seconds: 1234567890 },
    createdBy: 'user123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  describe('EnhancedPlayEditor', () => {
    it('should handle successful save without conflicts', async () => {
      mockGetPlays.mockResolvedValue([mockPlay]);
      mockUpdatePlay.mockResolvedValue();

      const onSave = jest.fn();
      const onError = jest.fn();

      render(
        <EnhancedPlayEditor
          teamId="team123"
          playId="play123"
          onSave={onSave}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Play')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePlay).toHaveBeenCalledWith(
          'team123',
          'play123',
          expect.objectContaining({
            name: 'Test Play',
            version: 1
          })
        );
        expect(onSave).toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
      });
    });

    it('should show conflict dialog when version conflict occurs', async () => {
      mockGetPlays.mockResolvedValue([mockPlay]);
      mockUpdatePlay.mockRejectedValue(new Error('Play has been modified by another user'));

      const onSave = jest.fn();
      const onError = jest.fn();

      render(
        <EnhancedPlayEditor
          teamId="team123"
          playId="play123"
          onSave={onSave}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Play')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
        expect(screen.getByText('Discard My Changes')).toBeInTheDocument();
        expect(screen.getByText('Merge Changes')).toBeInTheDocument();
        expect(screen.getByText('Overwrite Server Version')).toBeInTheDocument();
      });
    });

    it('should handle retry logic for network errors', async () => {
      mockGetPlays.mockResolvedValue([mockPlay]);
      mockUpdatePlay
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce();

      const onSave = jest.fn();
      const onError = jest.fn();

      render(
        <EnhancedPlayEditor
          teamId="team123"
          playId="play123"
          onSave={onSave}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Play')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePlay).toHaveBeenCalledTimes(3);
        expect(onSave).toHaveBeenCalled();
      });
    });

    it('should handle deleted play error', async () => {
      mockGetPlays.mockResolvedValue([]);
      mockUpdatePlay.mockRejectedValue(new Error('Play not found or has been deleted'));

      const onSave = jest.fn();
      const onError = jest.fn();

      render(
        <EnhancedPlayEditor
          teamId="team123"
          playId="play123"
          onSave={onSave}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Play not found')).toBeInTheDocument();
      });
    });

    it('should debounce rapid input changes', async () => {
      jest.useFakeTimers();
      
      mockGetPlays.mockResolvedValue([mockPlay]);

      render(
        <EnhancedPlayEditor
          teamId="team123"
          playId="play123"
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Play')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Play');
      
      // Rapid changes
      fireEvent.change(nameInput, { target: { value: 'New Name 1' } });
      fireEvent.change(nameInput, { target: { value: 'New Name 2' } });
      fireEvent.change(nameInput, { target: { value: 'New Name 3' } });

      // Fast-forward timers to trigger debounced save
      jest.runAllTimers();

      await waitFor(() => {
        expect(nameInput).toHaveValue('New Name 3');
      });

      jest.useRealTimers();
    });
  });

  describe('ConflictResolutionDialog', () => {
    const mockConflictState = {
      isOpen: true,
      localChanges: {
        name: 'My Version',
        description: 'My description'
      },
      serverVersion: {
        ...mockPlay,
        name: 'Server Version',
        description: 'Server description'
      },
      conflictingFields: ['name', 'description'],
      lastModifiedBy: 'otheruser',
      lastModifiedAt: new Date('2023-01-01T12:00:00Z')
    };

    it('should display conflict information correctly', () => {
      const onResolve = jest.fn();
      const onClose = jest.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={onClose}
          onResolve={onResolve}
          localChanges={mockConflictState.localChanges}
          serverVersion={mockConflictState.serverVersion}
          conflictDetails={{
            conflictingFields: mockConflictState.conflictingFields,
            lastModifiedBy: mockConflictState.lastModifiedBy,
            lastModifiedAt: mockConflictState.lastModifiedAt
          }}
        />
      );

      expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
      expect(screen.getByText(/modified by otheruser/)).toBeInTheDocument();
      expect(screen.getByText('Your version:')).toBeInTheDocument();
      expect(screen.getByText('Server version:')).toBeInTheDocument();
    });

    it('should handle discard action', async () => {
      const onResolve = jest.fn();
      const onClose = jest.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={onClose}
          onResolve={onResolve}
          localChanges={mockConflictState.localChanges}
          serverVersion={mockConflictState.serverVersion}
          conflictDetails={{
            conflictingFields: mockConflictState.conflictingFields,
            lastModifiedBy: mockConflictState.lastModifiedBy,
            lastModifiedAt: mockConflictState.lastModifiedAt
          }}
        />
      );

      const discardButton = screen.getByText('Discard My Changes');
      fireEvent.click(discardButton);

      expect(onResolve).toHaveBeenCalledWith('discard');
    });

    it('should handle merge action', async () => {
      const onResolve = jest.fn();
      const onClose = jest.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={onClose}
          onResolve={onResolve}
          localChanges={mockConflictState.localChanges}
          serverVersion={mockConflictState.serverVersion}
          conflictDetails={{
            conflictingFields: mockConflictState.conflictingFields,
            lastModifiedBy: mockConflictState.lastModifiedBy,
            lastModifiedAt: mockConflictState.lastModifiedAt
          }}
        />
      );

      const mergeButton = screen.getByText('Merge Changes');
      fireEvent.click(mergeButton);

      expect(onResolve).toHaveBeenCalledWith('merge');
    });

    it('should show overwrite warning and handle confirmation', async () => {
      const onResolve = jest.fn();
      const onClose = jest.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={onClose}
          onResolve={onResolve}
          localChanges={mockConflictState.localChanges}
          serverVersion={mockConflictState.serverVersion}
          conflictDetails={{
            conflictingFields: mockConflictState.conflictingFields,
            lastModifiedBy: mockConflictState.lastModifiedBy,
            lastModifiedAt: mockConflictState.lastModifiedAt
          }}
        />
      );

      const overwriteButton = screen.getByText('Overwrite Server Version');
      fireEvent.click(overwriteButton);

      // Should show warning modal
      await waitFor(() => {
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText(/You're about to overwrite changes/)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Overwrite Anyway');
      fireEvent.click(confirmButton);

      expect(onResolve).toHaveBeenCalledWith('overwrite');
    });

    it('should handle array field conflicts correctly', () => {
      const arrayConflictState = {
        ...mockConflictState,
        localChanges: {
          tags: ['tag1', 'tag2']
        },
        serverVersion: {
          ...mockPlay,
          tags: ['tag2', 'tag3']
        },
        conflictingFields: ['tags']
      };

      const onResolve = jest.fn();
      const onClose = jest.fn();

      render(
        <ConflictResolutionDialog
          isOpen={true}
          onClose={onClose}
          onResolve={onResolve}
          localChanges={arrayConflictState.localChanges}
          serverVersion={arrayConflictState.serverVersion}
          conflictDetails={{
            conflictingFields: arrayConflictState.conflictingFields,
            lastModifiedBy: arrayConflictState.lastModifiedBy,
            lastModifiedAt: arrayConflictState.lastModifiedAt
          }}
        />
      );

      expect(screen.getByText('tag1, tag2')).toBeInTheDocument();
      expect(screen.getByText('tag2, tag3')).toBeInTheDocument();
    });
  });

  describe('Merge Logic Tests', () => {
    it('should merge name fields correctly', () => {
      const local = { name: 'My Name' };
      const server = { ...mockPlay, name: '' };
      
      // Test that non-empty local name is preferred
      const merged = mergeChanges(local, server);
      expect(merged.name).toBe('My Name');
    });

    it('should merge difficulty levels correctly', () => {
      const local = { difficulty: 'advanced' as const };
      const server = { ...mockPlay, difficulty: 'beginner' as const };
      
      // Test that higher difficulty is preferred
      const merged = mergeChanges(local, server);
      expect(merged.difficulty).toBe('advanced');
    });

    it('should merge tags correctly', () => {
      const local = { tags: ['tag1', 'tag2'] };
      const server = { ...mockPlay, tags: ['tag2', 'tag3'] };
      
      // Test that unique tags are combined
      const merged = mergeChanges(local, server);
      expect(merged.tags).toEqual(['tag2', 'tag3', 'tag1']);
    });

    it('should merge descriptions correctly', () => {
      const local = { description: 'My additions' };
      const server = { ...mockPlay, description: 'Original description' };
      
      // Test that descriptions are combined
      const merged = mergeChanges(local, server);
      expect(merged.description).toContain('Original description');
      expect(merged.description).toContain('My additions');
    });
  });
});

// Helper function for merge logic testing
function mergeChanges(local: Partial<any>, server: any): any {
  const merged = { ...server };
  
  if (local.name && local.name.trim()) {
    merged.name = local.name;
  }
  
  if (local.formation && local.formation.trim()) {
    merged.formation = local.formation;
  }
  
  if (local.description && local.description !== server.description) {
    merged.description = `${server.description}\n\n--- Your additions ---\n${local.description}`;
  }
  
  const difficultyLevels = { beginner: 1, intermediate: 2, advanced: 3 };
  const localLevel = difficultyLevels[local.difficulty || 'beginner'];
  const serverLevel = difficultyLevels[server.difficulty];
  merged.difficulty = localLevel >= serverLevel ? local.difficulty : server.difficulty;
  
  const localTags = local.tags || [];
  const serverTags = server.tags || [];
  merged.tags = [...new Set([...serverTags, ...localTags])];
  
  return merged;
} 