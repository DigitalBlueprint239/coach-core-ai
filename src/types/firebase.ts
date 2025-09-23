// Firebase related types
import {
  FieldValue,
  Timestamp
} from 'firebase/firestore';

export interface FirebaseDocument {
  id: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface FirebaseCollection<T> {
  [key: string]: T;
}

export interface FirebaseQueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
    value: any;
  }>;
}

export interface FirebaseBatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: string;
  data?: any;
}

export interface FirebaseTransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}










