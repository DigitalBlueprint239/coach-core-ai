export interface CollaborationSession {
  id: string;
  type: 'practice-plan' | 'play-design' | 'team-management' | 'video-analysis';
  title: string;
  participants: CollaborationParticipant[];
  document: CollaborationDocument;
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
  updatedAt: Date;
  settings: CollaborationSettings;
}

export interface CollaborationParticipant {
  id: string;
  userId: string;
  displayName: string;
  role: 'head-coach' | 'assistant-coach' | 'player' | 'observer';
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  permissions: CollaborationPermission[];
  cursor?: CursorPosition;
  selections: TextSelection[];
}

export interface CollaborationDocument {
  id: string;
  type: string;
  content: any;
  version: number;
  lastModified: Date;
  modifiedBy: string;
  changeHistory: DocumentChange[];
}

export interface DocumentChange {
  id: string;
  type: 'insert' | 'delete' | 'update' | 'move' | 'comment';
  userId: string;
  timestamp: Date;
  data: any;
  metadata?: any;
}

export interface CollaborationSettings {
  allowAnonymous: boolean;
  requireApproval: boolean;
  autoSave: boolean;
  saveInterval: number; // seconds
  maxParticipants: number;
  enableComments: boolean;
  enableTracking: boolean;
  enableVersioning: boolean;
}

export interface CollaborationPermission {
  action: 'read' | 'write' | 'comment' | 'approve' | 'admin';
  resource: string;
  granted: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: Date;
}

export interface TextSelection {
  start: number;
  end: number;
  timestamp: Date;
}

export interface CollaborationComment {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  timestamp: Date;
  replies: CollaborationComment[];
  resolved: boolean;
  position?: { x: number; y: number };
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor-move' | 'selection-change' | 'content-change' | 'comment' | 'approval';
  participantId: string;
  timestamp: Date;
  data: any;
}

class RealTimeCollaborationEngine {
  private sessions: Map<string, CollaborationSession> = new Map();
  private participants: Map<string, CollaborationParticipant> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;
  private connectionRetryCount: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 1000;

  constructor() {
    this.initializeEngine();
  }

  private initializeEngine(): void {
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize connection
    this.connect();
  }

  private setupEventListeners(): void {
    // Listen for online/offline status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
  }

  private async connect(): Promise<void> {
    try {
      // Simulate WebSocket connection
      await this.simulateConnection();
      this.isConnected = true;
      this.connectionRetryCount = 0;
      this.emit('connected', { timestamp: new Date() });
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      this.handleConnectionError();
    }
  }

  private async simulateConnection(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  private handleConnectionError(): void {
    if (this.connectionRetryCount < this.maxRetries) {
      this.connectionRetryCount++;
      setTimeout(() => this.connect(), this.retryDelay * this.connectionRetryCount);
    } else {
      this.emit('connection-failed', { 
        error: 'Max retries exceeded',
        retryCount: this.connectionRetryCount 
      });
    }
  }

  private handleOnline(): void {
    if (!this.isConnected) {
      this.connect();
    }
  }

  private handleOffline(): void {
    this.isConnected = false;
    this.emit('disconnected', { timestamp: new Date() });
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.emit('page-hidden', { timestamp: new Date() });
    } else {
      this.emit('page-visible', { timestamp: new Date() });
    }
  }

  // **Session Management**

  public async createSession(
    type: CollaborationSession['type'],
    title: string,
    document: any,
    settings?: Partial<CollaborationSettings>
  ): Promise<CollaborationSession> {
    const sessionId = this.generateId();
    
    const defaultSettings: CollaborationSettings = {
      allowAnonymous: false,
      requireApproval: true,
      autoSave: true,
      saveInterval: 30,
      maxParticipants: 20,
      enableComments: true,
      enableTracking: true,
      enableVersioning: true,
    };

    const session: CollaborationSession = {
      id: sessionId,
      type,
      title,
      participants: [],
      document: {
        id: this.generateId(),
        type,
        content: document,
        version: 1,
        lastModified: new Date(),
        modifiedBy: 'system',
        changeHistory: [],
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: { ...defaultSettings, ...settings },
    };

    this.sessions.set(sessionId, session);
    this.emit('session-created', session);
    
    return session;
  }

  public async joinSession(
    sessionId: string,
    participant: Omit<CollaborationParticipant, 'id' | 'isOnline' | 'lastSeen'>
  ): Promise<CollaborationParticipant> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.participants.length >= session.settings.maxParticipants) {
      throw new Error('Session is full');
    }

    const participantId = this.generateId();
    const newParticipant: CollaborationParticipant = {
      ...participant,
      id: participantId,
      isOnline: true,
      lastSeen: new Date(),
    };

    session.participants.push(newParticipant);
    this.participants.set(participantId, newParticipant);
    
    session.updatedAt = new Date();
    
    this.emit('participant-joined', { sessionId, participant: newParticipant });
    this.emit('session-updated', session);
    
    return newParticipant;
  }

  public async leaveSession(sessionId: string, participantId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participantIndex = session.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) return;

    const participant = session.participants[participantIndex];
    participant.isOnline = false;
    participant.lastSeen = new Date();
    
    session.participants.splice(participantIndex, 1);
    this.participants.delete(participantId);
    
    session.updatedAt = new Date();
    
    this.emit('participant-left', { sessionId, participant });
    this.emit('session-updated', session);
  }

  public async updateDocument(
    sessionId: string,
    participantId: string,
    changes: DocumentChange[]
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Apply changes to document
    for (const change of changes) {
      change.id = this.generateId();
      change.userId = participantId;
      change.timestamp = new Date();
      
      session.document.changeHistory.push(change);
      session.document.version++;
      session.document.lastModified = new Date();
      session.document.modifiedBy = participantId;
    }

    session.updatedAt = new Date();
    
    this.emit('document-updated', { 
      sessionId, 
      changes, 
      version: session.document.version,
      participant 
    });
    this.emit('session-updated', session);
  }

  public async addComment(
    sessionId: string,
    participantId: string,
    content: string,
    position?: { x: number; y: number }
  ): Promise<CollaborationComment> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.settings.enableComments) {
      throw new Error('Comments are disabled for this session');
    }

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    const comment: CollaborationComment = {
      id: this.generateId(),
      userId: participantId,
      displayName: participant.displayName,
      content,
      timestamp: new Date(),
      replies: [],
      resolved: false,
      position,
    };

    // Add comment to document change history
    const change: DocumentChange = {
      id: this.generateId(),
      type: 'comment',
      userId: participantId,
      timestamp: new Date(),
      data: comment,
    };

    session.document.changeHistory.push(change);
    session.document.version++;
    session.document.lastModified = new Date();
    session.document.modifiedBy = participantId;
    session.updatedAt = new Date();

    this.emit('comment-added', { sessionId, comment, participant });
    this.emit('session-updated', session);

    return comment;
  }

  public async updateCursor(
    sessionId: string,
    participantId: string,
    position: CursorPosition
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) return;

    participant.cursor = position;
    participant.lastSeen = new Date();

    this.emit('cursor-updated', { sessionId, participantId, position });
  }

  public async updateSelection(
    sessionId: string,
    participantId: string,
    selections: TextSelection[]
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) return;

    participant.selections = selections;
    participant.lastSeen = new Date();

    this.emit('selection-updated', { sessionId, participantId, selections });
  }

  public async approveChange(
    sessionId: string,
    participantId: string,
    changeId: string,
    approved: boolean
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.settings.requireApproval) {
      throw new Error('Approval is not required for this session');
    }

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) return;

    const hasApprovalPermission = participant.permissions.some(
      p => p.action === 'approve' && p.granted
    );

    if (!hasApprovalPermission) {
      throw new Error('Participant does not have approval permission');
    }

    const change = session.document.changeHistory.find(c => c.id === changeId);
    if (!change) return;

    // Mark change as approved/rejected
    change.metadata = { ...change.metadata, approved, approvedBy: participantId, approvedAt: new Date() };

    this.emit('change-approved', { sessionId, changeId, approved, participant });
    this.emit('session-updated', session);
  }

  // **Session Queries**

  public getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getSessionsByType(type: CollaborationSession['type']): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.type === type);
  }

  public getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  public getParticipant(sessionId: string, participantId: string): CollaborationParticipant | undefined {
    const session = this.sessions.get(sessionId);
    return session?.participants.find(p => p.id === participantId);
  }

  public getOnlineParticipants(sessionId: string): CollaborationParticipant[] {
    const session = this.sessions.get(sessionId);
    return session?.participants.filter(p => p.isOnline) || [];
  }

  // **Event System**

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // **Utility Methods**

  private generateId(): string {
    return `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public isConnected(): boolean {
    return this.isConnected;
  }

  public getConnectionStatus(): { isConnected: boolean; retryCount: number } {
    return {
      isConnected: this.isConnected,
      retryCount: this.connectionRetryCount,
    };
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.emit('disconnected', { timestamp: new Date() });
  }

  public async cleanup(): Promise<void> {
    // Clean up all sessions and participants
    this.sessions.clear();
    this.participants.clear();
    
    // Remove all event listeners
    this.eventListeners.clear();
    
    // Disconnect
    await this.disconnect();
  }
}

export const realTimeCollaborationEngine = new RealTimeCollaborationEngine();
export default realTimeCollaborationEngine;
