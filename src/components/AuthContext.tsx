'use client';

import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  User as FirebaseUser, sendEmailVerification
} from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, increment, collection,
  query, where, getDocs, serverTimestamp, addDoc, orderBy, writeBatch, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User, ExamResult, Rating, UserChallengeAttempt, SupportTicket, SupportMessage, CsatRating, UserRole, ContentItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays } from 'date-fns';

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLogin: boolean;
  login: (email: string, pass: string, isAdminLogin: boolean) => Promise<void>;
  register: (name: string, email: string, pass: string, sendVerification?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User> & { newAvatarFile?: File | null }, targetUserId?: string) => Promise<void>;
  setExamType: (examType: string) => Promise<void>;
  addStudyTime: (seconds: number, subject: string) => Promise<void>;
  addExamResult: (result: Omit<ExamResult, 'resultId'>) => Promise<void>;
  updateExamResult: (resultId: string, updates: Partial<ExamResult>) => Promise<void>;
  deleteExamResult: (resultId: string) => Promise<void>;
  addQuizCompletion: () => Promise<void>;
  addRating: (rating: number, comment: string) => Promise<void>;
  saveChallengeAttempt: (attempt: Omit<UserChallengeAttempt, 'challengeId' | 'userId' | 'userName' | 'userAvatar'>) => Promise<void>;
  hasAttemptedToday: () => Promise<boolean>;
  setPremiumForDays: (userId: string, days: number | null) => Promise<void>;
  createSupportTicket: (subject: string) => Promise<string | null>;
  sendSupportMessage: (ticketId: string, text: string, senderId: string) => Promise<void>;
  getSupportTickets: () => Promise<SupportTicket[]>;
  markTicketAsRead: (ticketId: string) => Promise<void>;
  resolveSupportTicket: (ticketId: string) => Promise<void>;
  reopenSupportTicket: (ticketId: string) => Promise<void>;
  submitTicketRating: (ticketId: string, rating: number, comment?: string) => Promise<void>;
  banUser: (userId: string, reason: string, bannedUntil: Date | null) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  markFreeContentAsViewed: (contentId: string) => Promise<void>;
  playPodcast: (podcast: ContentItem) => void;
  togglePodcast: () => void;
  stopPodcast: () => void;
  activePodcast: ContentItem | null;
  isPodcastPlaying: boolean;
  isPlayerMinimized: boolean;
  togglePlayerMinimized: () => void;
  restorePlayer: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Podcast Player State
  const [activePodcast, setActivePodcast] = useState<ContentItem | null>(null);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const { auth, db } = getFirebaseServices();

    // Add a timeout to ensure loading doesn't hang indefinitely
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading timeout - setting loading to false");
        setIsLoading(false);
        setUser(null);
        setFirebaseUser(null);
      }
    }, 10000); // 10 second timeout

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(loadingTimeout); // Clear timeout if auth resolves
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.emailVerified) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const fullUserData = { ...userData, id: fbUser.uid, isAdmin: userData.role === 'admin' };
            setUser(fullUserData);
            if (!userData.examType && userData.role === 'normal') {
              setIsFirstLogin(true);
            } else {
              setIsFirstLogin(false);
            }

            // Check if trial has expired without using exam
            if (userData.premiumPlan === 'trial' && userData.premiumUntil) {
              const now = new Date();
              const trialEnd = userData.premiumUntil.toDate();
              const examsTaken = userData.examsTakenThisPeriod || 0;
              if (now > trialEnd && examsTaken === 0) {
                // Revoke trial access
                updateDoc(userDocRef, {
                  premiumPlan: null,
                  premiumUntil: null,
                  examsTakenThisPeriod: 0
                });
              }
            }
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setUser(null);
          setIsLoading(false);
        });
        return () => unsubscribeUser();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      clearTimeout(loadingTimeout);
      setUser(null);
      setFirebaseUser(null);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribeAuth();
    };
  }, []);

  const handleAuthError = (error: any) => {
    let description = 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
    switch (error.code) {
      case 'auth/invalid-credential':
        description = 'Las credenciales son incorrectas. Por favor, inténtalo de nuevo.';
        break;
      case 'auth/email-already-in-use':
        description = 'Este correo electrónico ya está en uso. Por favor, intenta iniciar sesión o usa un correo diferente.';
        break;
      case 'auth/popup-closed-by-user':
        description = 'Has cerrado la ventana de inicio de sesión. Inténtalo de nuevo.';
        break;
      case 'auth/network-request-failed':
        description = 'Error de red. Por favor, revisa tu conexión a internet e inténtalo de nuevo.';
        break;
    }

    toast({
      variant: "destructive",
      title: "Error de autenticación",
      description: description,
    });
    console.error("Auth Error:", error);
  };

  const login = async (email: string, pass: string, isAdminLogin: boolean) => {
    const { auth, db } = getFirebaseServices();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (!userCredential.user.emailVerified) {
        toast({
          variant: "destructive",
          title: "Verificación de correo requerida",
          description: "Por favor, verifica tu correo electrónico para continuar. Revisa tu bandeja de entrada.",
        });
        await signOut(auth);
        return;
      }
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        const userIsAdminOrSupport = userData.role === 'admin' || userData.role === 'support' || userData.role === 'supervisor_support';
        if (isAdminLogin && !userIsAdminOrSupport) {
          toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'No tienes permiso para acceder a esta sección.' });
          await signOut(auth);
          return;
        }
        if (!isAdminLogin && userIsAdminOrSupport) {
          toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Usa el portal de administración para iniciar sesión.' });
          await signOut(auth);
          return;
        }
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  // Provide stubs for missing methods to satisfy the interface for now
  const register = async () => true;
  const logout = async () => { };
  const updateUser = async () => { };
  const setExamType = async () => { };
  const addStudyTime = async () => { };
  const addExamResult = async () => { };
  const updateExamResult = async () => { };
  const deleteExamResult = async () => { };
  const addQuizCompletion = async () => { };
  const addRating = async () => { };
  const saveChallengeAttempt = async () => { };
  const hasAttemptedToday = async () => false;
  const setPremiumForDays = async () => { };
  const createSupportTicket = async () => null;
  const sendSupportMessage = async () => { };
  const getSupportTickets = async () => [];
  const markTicketAsRead = async () => { };
  const resolveSupportTicket = async () => { };
  const reopenSupportTicket = async () => { };
  const submitTicketRating = async () => { };
  const banUser = async () => { };
  const unbanUser = async () => { };
  const markFreeContentAsViewed = async () => { };
  const playPodcast = () => { };
  const togglePodcast = () => { };
  const stopPodcast = () => { };
  const togglePlayerMinimized = () => { };
  const restorePlayer = () => { };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    isLoading,
    isFirstLogin,
    login,
    register,
    logout,
    updateUser,
    setExamType,
    addStudyTime,
    addExamResult,
    updateExamResult,
    deleteExamResult,
    addQuizCompletion,
    addRating,
    saveChallengeAttempt,
    hasAttemptedToday,
    setPremiumForDays,
    createSupportTicket,
    sendSupportMessage,
    getSupportTickets,
    markTicketAsRead,
    resolveSupportTicket,
    reopenSupportTicket,
    submitTicketRating,
    banUser,
    unbanUser,
    markFreeContentAsViewed,
    playPodcast,
    togglePodcast,
    stopPodcast,
    activePodcast,
    isPodcastPlaying,
    isPlayerMinimized,
    togglePlayerMinimized,
    restorePlayer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
