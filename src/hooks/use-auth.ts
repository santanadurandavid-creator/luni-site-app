
'use client';

import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import { useContext } from 'react';
import { useToast } from './use-toast';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// This custom hook provides a simplified interface to the AuthContext,
// but it's now recommended to use the context directly for cleaner separation of concerns.
// This file can be refactored or removed in the future.
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // You can add simplified or combined functions here if needed,
  // but for now, we just return the full context.
  return context;
};
