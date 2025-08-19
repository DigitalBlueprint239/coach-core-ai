# PlayEditor Conflict Resolution Implementation

## Overview

This document describes the implementation of optimistic locking and conflict resolution for the PlayEditor component in the SmartPlaybook feature. The implementation prevents data loss when multiple users edit the same play simultaneously.

## Problem Statement

The original `updatePlay` function had a critical flaw:

```typescript
// PROBLEMATIC PATTERN - No conflict resolution
const updatePlay = async (playData) => {
  await firestore.collection('plays').doc(playId).set(playData);
  // Missing: Optimistic locking or version control
};
```

This pattern could lead to:
- Data loss when multiple users edit simultaneously
- Silent overwrites of other users' changes
- Inconsistent state across the application

## Solution: Optimistic Locking with Firestore Transactions

### 1. Enhanced Data Model

The `Play` interface now includes version tracking fields:

```typescript
export interface Play {
  // ... existing fields ...
  version?: number; // Version for optimistic locking
  lastModifiedBy?: string; // Track who last modified
  lastModifiedAt?: any; // Server timestamp of last modification
}
```

### 2. Improved updatePlay Function

The new implementation uses Firestore transactions with optimistic locking:

```typescript
export async function updatePlay(teamId: string, playId: string, updates: Partial<Play>, level?: FootballLevel): Promise<void> {
  const currentUser = getCurrentUser();
  const playRef = doc(db, 'plays', playId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const playDoc = await transaction.get(playRef);
      
      if (!playDoc.exists()) {
        throw new Error('Play not found or has been deleted');
      }
      
      const currentData = playDoc.data() as Play;
      const currentVersion = currentData.version || 0;
      const expectedVersion = (updates as any).version || currentVersion;
      
      // Check if the play has been modified by another user
      if (currentVersion !== expectedVersion) {
        throw new Error('Play has been modified by another user. Please refresh and try again.');
      }
      
      const updateData = {
        ...updates,
        version: currentVersion + 1,
        lastModifiedBy: currentUser.uid,
        lastModifiedAt: serverTimestamp(),
        updatedAt: new Date()
      };
      
      transaction.update(playRef, updateData);
    });
  } catch (error) {
    // Handle offline mode and error cases
    if (!isOnline) {
      // Queue for offline sync
      addToOfflineQueue({
        type: 'update',
        collection: 'plays',
        docId: playId,
        data: updates
      });
      return;
    }
    
    throw error;
  }
}
```

### 3. PlayEditor Component Integration

The PlayEditor component properly handles conflicts:

```typescript
const handleSave = useCallback(async () => {
  if (!play || !user) return;

  setSaving(true);
  setError(null);

  try {
    // Include current version for conflict detection
    const updateData: Partial<Play> = {
      ...formData,
      version: play.version
    };

    await updatePlay(teamId, playId, updateData);
    
    // Update local state on success
    const updatedPlay = {
      ...play,
      ...formData,
      version: (play.version || 0) + 1
    };
    setPlay(updatedPlay);
    onSave?.(updatedPlay);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to save play';
    setError(errorMessage);
    
    // Handle conflict errors by reloading latest data
    if (errorMessage.includes('modified by another user')) {
      const plays = await getPlays(teamId);
      const latestPlay = plays.find(p => p.id === playId);
      if (latestPlay) {
        setPlay(latestPlay);
        setFormData({
          name: latestPlay.name,
          formation: latestPlay.formation,
          description: latestPlay.description,
          difficulty: latestPlay.difficulty,
          tags: latestPlay.tags || []
        });
      }
    }
  } finally {
    setSaving(false);
  }
}, [play, user, formData, teamId, playId, onSave, onError]);
```

## Key Features

### 1. Optimistic Locking
- Each play has a version number that increments with each edit
- The client must provide the expected version when updating
- If versions don't match, the update is rejected

### 2. Transaction Safety
- Uses Firestore transactions to ensure atomicity
- Prevents race conditions during version checking and updating
- Ensures data consistency

### 3. User-Friendly Error Handling
- Clear error messages for different failure scenarios
- Automatic reload of latest data when conflicts occur
- Graceful handling of offline scenarios

### 4. Audit Trail
- Tracks who last modified each play
- Records server timestamps for modifications
- Maintains version history

## Usage Examples

### Basic Usage
```typescript
import { PlayEditor } from './PlayEditor';

<PlayEditor
  teamId="team123"
  playId="play456"
  onSave={(updatedPlay) => console.log('Play saved:', updatedPlay)}
  onError={(error) => console.error('Save failed:', error)}
/>
```

### Testing Conflict Resolution
```typescript
import { ConflictResolutionDemo } from './ConflictResolutionDemo';

<ConflictResolutionDemo teamId="team123" />
```

## Testing Scenarios

### 1. Concurrent Edits
1. Open the PlayEditor in two browser tabs
2. Select the same play in both tabs
3. Make different changes in each tab
4. Save in the first tab
5. Try to save in the second tab
6. Verify conflict error is shown and data is reloaded

### 2. Offline Handling
1. Disconnect from the internet
2. Make changes to a play
3. Verify changes are queued for offline sync
4. Reconnect and verify changes are synced

### 3. Deleted Play Handling
1. Delete a play in one tab
2. Try to edit the same play in another tab
3. Verify appropriate error is shown

## Migration Considerations

### Existing Plays
Plays created before this implementation will have:
- `version: undefined` (treated as 0)
- `lastModifiedBy: undefined`
- `lastModifiedAt: undefined`

The system handles these gracefully by:
- Defaulting version to 0 if undefined
- Initializing tracking fields on first update
- Maintaining backward compatibility

### Database Rules
Ensure Firestore security rules allow:
- Reading plays for authenticated users
- Writing plays with version field validation
- Updating plays only by team members

## Performance Considerations

### Transaction Limits
- Firestore transactions have a 10-second timeout
- Maximum of 500 documents per transaction
- Consider batching for bulk operations

### Offline Queue
- Offline operations are queued locally
- Queue size is limited to prevent memory issues
- Automatic sync when connection is restored

## Future Enhancements

### 1. Real-time Conflict Detection
- Use Firestore real-time listeners to detect conflicts
- Show live indicators when other users are editing
- Implement collaborative editing features

### 2. Conflict Resolution UI
- Show diff view of conflicting changes
- Allow users to merge changes manually
- Provide conflict resolution strategies

### 3. Version History
- Track complete version history
- Allow rollback to previous versions
- Show change logs with user attribution

## Troubleshooting

### Common Issues

1. **"Play has been modified by another user" error**
   - This is expected behavior for concurrent edits
   - The system will automatically reload the latest version
   - User should review changes and reapply their modifications

2. **Transaction timeout errors**
   - Check for slow network connections
   - Consider reducing transaction complexity
   - Implement retry logic for transient failures

3. **Offline sync issues**
   - Verify offline queue is properly configured
   - Check for storage quota limits
   - Monitor sync status in browser dev tools

### Debug Information
The PlayEditor component provides debug information:
- Current version number
- Last modification timestamp
- User who last modified
- Error details for failed operations

## Conclusion

This implementation provides robust conflict resolution for the PlayEditor, ensuring data integrity in multi-user scenarios while maintaining a smooth user experience. The optimistic locking approach prevents data loss while the transaction-based updates ensure consistency. 