
'use client';

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  increment,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
  deleteDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type {
  User,
  ExamResult,
  Rating,
  UserChallengeAttempt,
  SupportTicket,
  SupportMessage,
  CsatRating,
  ContentItem,
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { getDeviceId } from '@/lib/utils';
import { initCacheManagement } from '@/lib/cache-manager';


// === UTILIDADES ===
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const timestampToDate = (ts: any): Date | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  return null;
};

const getExamsAllowed = (
  plan?: '10-day' | '30-day' | '60-day' | 'permanent' | 'trial' | 'custom' | null,
  customExams?: number
): number => {
  switch (plan) {
    case '10-day':
      return 1;
    case '30-day':
      return 3;
    case '60-day':
      return 6;
    case 'permanent':
      return Infinity;
    case 'trial':
      return 1;
    case 'custom':
      return customExams || 0;
    default:
      return 0;
  }
};

// === CONTEXT ===
export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  isFirstLogin: boolean;
  needsProfileSetup: boolean;
  setIsFirstLogin: (value: boolean) => void;
  setNeedsProfileSetup: (value: boolean) => void;
  login: (email: string, pass: string, isAdminLogin: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPhoneVerification: (phoneNumber: string, recaptchaContainerId: string) => Promise<any>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    pass: string,
    sendVerification?: boolean,
    phone?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  startTrial: () => Promise<boolean>;
  updateUser: (
    data: Partial<User> & { newAvatarFile?: File | null },
    targetUserId?: string
  ) => Promise<void>;
  setExamType: (examType: string) => Promise<void>;
  addStudyTime: (seconds: number, subject: string) => Promise<void>;
  addExamResult: (result: Omit<ExamResult, 'resultId'>) => Promise<void>;
  updateExamResult: (
    resultId: string,
    updates: Partial<ExamResult>
  ) => Promise<void>;
  deleteExamResult: (resultId: string) => Promise<void>;
  addQuizCompletion: () => Promise<void>;
  incrementReadingsCompleted: () => Promise<void>;
  incrementMultimediaWatched: (contentId?: string) => Promise<void>;
  handleQuizCompletion: (score: number, totalQuestions: number) => Promise<void>;
  addRating: (rating: number, comment: string) => Promise<void>;
  saveChallengeAttempt: (
    attempt: Omit<
      UserChallengeAttempt,
      'challengeId' | 'userId' | 'userName' | 'userAvatar'
    >
  ) => Promise<void>;
  hasAttemptedToday: () => Promise<boolean>;
  setPremiumForDays: (userId: string, days: number | null, numTokens?: number) => Promise<void>;
  createSupportTicket: (subject: string) => Promise<string | null>;
  sendSupportMessage: (
    ticketId: string,
    text: string,
    senderId: string
  ) => Promise<void>;
  getSupportTickets: () => Promise<SupportTicket[]>;
  markTicketAsRead: (ticketId: string) => Promise<void>;
  resolveSupportTicket: (ticketId: string) => Promise<void>;
  reopenSupportTicket: (ticketId: string) => Promise<void>;
  submitTicketRating: (
    ticketId: string,
    rating: number,
    comment?: string
  ) => Promise<void>;
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
  showQuizMilestoneModal: boolean;
  milestoneReward: { quizzes: number; minutes: number } | null;
  closeQuizMilestoneModal: () => void;
  isContentModalOpen: boolean;
  setIsContentModalOpen: (value: boolean) => void;
  isQuizModalOpen: boolean;
  setIsQuizModalOpen: (value: boolean) => void;
  resetStudyTime: () => Promise<void>;
  resetQuizzesCompleted: () => Promise<void>;
  resetReadingsCompleted: () => Promise<void>;
  resetMultimediaWatched: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  // Podcast
  const [activePodcast, setActivePodcast] = useState<ContentItem | null>(null);
  const [isPodcastPlaying, setIsPodcastPlaying] = useState(false);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState(false);

  // Modals
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [showQuizMilestoneModal, setShowQuizMilestoneModal] = useState(false);
  const [milestoneReward, setMilestoneReward] = useState<{
    quizzes: number;
    minutes: number;
  } | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const studyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // === CACHE MANAGEMENT ===
  useEffect(() => {
    // Initialize cache management on mount
    initCacheManagement();
  }, []);


  // === AUTH STATE ===
  useEffect(() => {
    const { auth, db } = getFirebaseServices();
    let unsubscribeUser: (() => void) | undefined;

    // Set persistence to LOCAL to ensure session survives browser closes
    const initAuth = async () => {
      try {
        const { setPersistence, browserLocalPersistence } = await import('firebase/auth');
        await setPersistence(auth, browserLocalPersistence);
        console.log('[AUTH] Persistence set to LOCAL');
      } catch (error) {
        console.error('[AUTH] Error setting persistence:', error);
      }
    };
    initAuth();

    // Reduced timeout from 10s to 5s for better UX
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[AUTH] Loading timeout after 5s, showing login screen');
        setIsLoading(false);
      }
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (fbUser) => {
        clearTimeout(loadingTimeout);
        setFirebaseUser(fbUser);

        if (fbUser && (fbUser.emailVerified || fbUser.providerData.some(p => p?.providerId === 'google.com'))) {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
              email: fbUser.email,
              avatar: fbUser.photoURL || '',
              examType: null,
              studyTime: {},
              role: 'normal',
              quizzesCompleted: 0,
              qualifyingQuizzesCount: 0,
              premiumBenefitCount: 0,
              ratings: [],
              challengeAttempts: [],
              premiumPlan: null,
              premiumUntil: null,
              examsTakenThisPeriod: 0,
              viewedFreeContentIds: [],
              registeredClasses: [],
              banDetails: { isBanned: false, bannedUntil: null, reason: '', bannedAt: null },
              hasTakenDiagnosticExam: false,
              diagnosticExamResult: null,
              createdAt: serverTimestamp(),
            });
          }

          unsubscribeUser = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data() as User;
                const fullUser = { ...data, id: fbUser.uid, isAdmin: data.role === 'admin' };
                setUser(fullUser);
                setIsFirstLogin(!data.examType && data.role === 'normal');
                setNeedsProfileSetup((!data.name || !data.phone) && data.role === 'normal');

                // Trial expiration
                if (data.premiumPlan === 'trial' && data.premiumUntil) {
                  const end = timestampToDate(data.premiumUntil);
                  if (end && new Date() > end) {
                    updateDoc(userDocRef, {
                      premiumPlan: null,
                      premiumUntil: null,
                      examsTakenThisPeriod: 0,
                    });
                  }
                }
              } else {
                setUser(null);
              }
              setIsLoading(false);
            },
            (err) => {
              console.error('Snapshot error:', err);
              setUser(null);
              setIsLoading(false);
            }
          );
        } else {
          setUser(null);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Auth error:', err);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribeAuth();
      unsubscribeUser?.();
    };
  }, []);

  // === STUDY TIME TRACKER ===
  useEffect(() => {
    if (studyIntervalRef.current) {
      clearInterval(studyIntervalRef.current);
    }

    if (user && (isContentModalOpen || isQuizModalOpen || isPodcastPlaying)) {
      studyIntervalRef.current = setInterval(() => {
        const subject = activePodcast?.subject || 'General';
        addStudyTime(1, subject);
      }, 1000);
    }

    return () => {
      if (studyIntervalRef.current) {
        clearInterval(studyIntervalRef.current);
        studyIntervalRef.current = null;
      }
    };
  }, [user, isContentModalOpen, isQuizModalOpen, isPodcastPlaying, activePodcast]);

  // === FCM NOTIFICATIONS ===
  const fcmSetupRef = useRef(false);
  const unsubscribeMessageRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      if (!user) {
        console.log('[FCM] No user logged in, skipping notification setup');
        return;
      }

      // Prevent multiple setups
      if (fcmSetupRef.current) {
        return;
      }
      fcmSetupRef.current = true;

      console.log('[FCM] Starting notification setup for user:', user.id);

      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const { messaging, db } = getFirebaseServices();
          if (!messaging) {
            console.error('[FCM] Messaging not available (likely server-side)');
            fcmSetupRef.current = false;
            return;
          }

          console.log('[FCM] Requesting notification permission...');
          const permission = await Notification.requestPermission();
          console.log('[FCM] Permission result:', permission);

          if (permission === 'granted') {
            const { getToken, onMessage } = await import('firebase/messaging');

            // Wait for service worker to be ready
            let registration;
            try {
              console.log('[FCM] Waiting for service worker...');
              registration = await navigator.serviceWorker.ready;
              console.log('[FCM] Service worker ready:', registration);
            } catch (e) {
              console.error('[FCM] Error getting service worker registration:', e);
              fcmSetupRef.current = false;
              return;
            }

            // Get token
            console.log('[FCM] Getting FCM token...');
            const token = await getToken(messaging, {
              vapidKey: 'BBDbZ3971pfKJMBQhGHWrWs-uUD1Rpy1ep-3QkVTz56RpeBbEy6gkH66W0JedDefmXx9aXVWHRr-xt0FggoAoQk',
              serviceWorkerRegistration: registration
            });

            if (token) {
              console.log('[FCM] Token obtained successfully:', token.substring(0, 20) + '...');
              // Update user with FCM token if it's new
              if (user.fcmToken !== token) {
                console.log('[FCM] Updating user with new token...');
                await updateDoc(doc(db, 'users', user.id), {
                  fcmToken: token,
                  lastFcmUpdate: serverTimestamp()
                });
                console.log('[FCM] Token saved to Firestore');
              } else {
                console.log('[FCM] Token unchanged, no update needed');
              }
            } else {
              console.error('[FCM] No token received');
            }

            // Handle foreground messages - store unsubscribe function
            unsubscribeMessageRef.current = onMessage(messaging, (payload) => {
              console.log('[FCM] Foreground message received:', payload);

              // Show native notification
              if (Notification.permission === 'granted') {
                const notificationTitle = payload.notification?.title || 'Nueva notificación';
                const notificationOptions = {
                  body: payload.notification?.body,
                  icon: '/icon-192x192.png',
                  data: payload.data
                };
                try {
                  new Notification(notificationTitle, notificationOptions);
                } catch (e) {
                  console.error('[FCM] Error showing native notification:', e);
                }
              }

              // Get the URL from the payload
              const url = payload.data?.url || payload.data?.clickAction || payload.fcmOptions?.link;

              // Check if URL is internal (same domain)
              const isInternalUrl = url && (
                url.includes('luni.site') ||
                url.includes('studio--studio-5437783532-5f953.us-central1.hosted.app') ||
                url.startsWith('/')
              );

              if (isInternalUrl) {
                // Better internal navigation
                console.log('[FCM] Navigating to internal URL:', url);

                // If it's a special type like 'retos', we might want to trigger a custom event
                if (payload.data?.type === 'retos') {
                  const event = new CustomEvent('openChallengesModal', {
                    detail: { tab: payload.data?.tab || 'retos' }
                  });
                  window.dispatchEvent(event);
                } else {
                  router.push(url);
                }
              } else {
                // Show toast for external URLs or no URL
                toast({
                  title: payload.notification?.title || 'Nueva notificación',
                  description: payload.notification?.body || '',
                });
              }
            });
          } else {
            console.warn('[FCM] Notification permission denied or dismissed');
            fcmSetupRef.current = false;
          }
        } else {
          console.error('[FCM] Service Worker not supported in this browser');
          fcmSetupRef.current = false;
        }
      } catch (error) {
        console.error('[FCM] Error setting up notifications:', error);
        fcmSetupRef.current = false;
      }
    };

    setupNotifications();

    // Cleanup function
    return () => {
      if (unsubscribeMessageRef.current) {
        unsubscribeMessageRef.current();
        unsubscribeMessageRef.current = null;
      }
    };
  }, [user?.id, toast]);

  // === UPDATE LAST ACTIVITY ===
  useEffect(() => {
    const updateLastActivity = async () => {
      if (!user) return;

      try {
        const { db } = getFirebaseServices();
        await updateDoc(doc(db, 'users', user.id), {
          lastActivity: serverTimestamp()
        });
        console.log('[ACTIVITY] Updated lastActivity for user:', user.id);
      } catch (error) {
        console.error('[ACTIVITY] Error updating lastActivity:', error);
      }
    };

    // Update on mount and every 5 minutes while the app is open
    updateLastActivity();
    const interval = setInterval(updateLastActivity, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user?.id]);

  // === AUTH FUNCTIONS ===
  const handleAuthError = useCallback((error: any) => {
    let description = 'Ocurrió un error. Intenta de nuevo.';
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        description = 'Credenciales incorrectas.';
        break;
      case 'auth/email-already-in-use':
        description = 'Este correo ya está en uso.';
        break;
      case 'auth/popup-closed-by-user':
        description = 'Ventana cerrada.';
        break;
      case 'auth/network-request-failed':
        description = 'Error de red.';
        break;
      case 'auth/unverified-email':
        description = 'Verifica tu correo.';
        if (error.customData?.email) {
          localStorage.setItem('unverifiedEmailForResend', error.customData.email);
          localStorage.setItem('lastVerificationAttempt', Date.now().toString());
        }
        break;
    }
    toast({ variant: 'destructive', title: 'Error', description });
  }, [toast]);

  const login = useCallback(async (email: string, pass: string, isAdminLogin: boolean) => {
    const { auth, db } = getFirebaseServices();
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const fbUser = cred.user;

      if (!fbUser.emailVerified) {
        toast({ variant: 'destructive', title: 'Verifica tu correo', description: 'Revisa tu bandeja.' });
        await signOut(auth);
        return;
      }

      const docRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as User;
        if (isAdminLogin && data.role && !['admin', 'support', 'supervisor_support', 'content_creator'].includes(data.role)) {
          toast({ variant: 'destructive', title: 'Acceso denegado' });
          await signOut(auth);
          return;
        }
        setUser({ ...data, id: fbUser.uid, isAdmin: data.role === 'admin' });
        setFirebaseUser(fbUser);
      } else {
        toast({ variant: 'destructive', title: 'Usuario no encontrado' });
        await signOut(auth);
      }
    } catch (err: any) {
      handleAuthError(err);
    }
  }, [toast, handleAuthError]);

  const loginWithGoogle = useCallback(async () => {
    const { auth, db } = getFirebaseServices();
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      // Check if user document exists, if not create it
      const docRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        // Create new user document for Google sign-in
        await setDoc(docRef, {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
          email: fbUser.email,
          avatar: fbUser.photoURL || '',
          examType: null,
          studyTime: {},
          role: 'normal',
          quizzesCompleted: 0,
          qualifyingQuizzesCount: 0,
          premiumBenefitCount: 0,
          ratings: [],
          challengeAttempts: [],
          premiumPlan: null,
          premiumUntil: null,
          examsTakenThisPeriod: 0,
          viewedFreeContentIds: [],
          registeredClasses: [],
          banDetails: { isBanned: false, bannedUntil: null, reason: '', bannedAt: null },
          hasTakenDiagnosticExam: false,
          diagnosticExamResult: null,
          createdAt: serverTimestamp(),
        });
      }

      const userData = snap.exists() ? snap.data() as User : null;
      if (userData) {
        setUser({ ...userData, id: fbUser.uid, isAdmin: userData.role === 'admin' });
      }
      setFirebaseUser(fbUser);

      toast({ title: 'Bienvenido', description: 'Sesión iniciada correctamente' });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        handleAuthError(err);
      }
    }
  }, [toast, handleAuthError]);

  const sendPhoneVerification = useCallback(async (phoneNumber: string, recaptchaContainerId: string) => {
    const { auth } = getFirebaseServices();
    try {
      // Initialize reCAPTCHA
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
      });

      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      toast({ title: 'Código enviado', description: 'Revisa tu teléfono para el código de verificación' });
      return confirmationResult;
    } catch (err: any) {
      console.error('Error sending phone verification:', err);
      let description = 'No se pudo enviar el código de verificación.';
      if (err.code === 'auth/invalid-phone-number') {
        description = 'Número de teléfono inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        description = 'Demasiados intentos. Intenta más tarde.';
      }
      toast({ variant: 'destructive', title: 'Error', description });
      throw err;
    }
  }, [toast]);

  const verifyPhoneCode = useCallback(async (verificationId: string, code: string) => {
    const { auth, db } = getFirebaseServices();
    try {
      // Verify the code
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const result = await signInWithPhoneNumber(auth, verificationId, code as any);
      const userCredential = await result.confirm(code);
      const fbUser = userCredential.user;

      // Check if user document exists, if not create it
      const docRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        // Create new user document for phone sign-in
        await setDoc(docRef, {
          id: fbUser.uid,
          name: fbUser.phoneNumber || 'Usuario',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          avatar: '',
          examType: null,
          studyTime: {},
          role: 'normal',
          quizzesCompleted: 0,
          qualifyingQuizzesCount: 0,
          premiumBenefitCount: 0,
          ratings: [],
          challengeAttempts: [],
          premiumPlan: null,
          premiumUntil: null,
          examsTakenThisPeriod: 0,
          viewedFreeContentIds: [],
          registeredClasses: [],
          banDetails: { isBanned: false, bannedUntil: null, reason: '', bannedAt: null },
          hasTakenDiagnosticExam: false,
          diagnosticExamResult: null,
          createdAt: serverTimestamp(),
        });
      }

      const userData = snap.exists() ? snap.data() as User : null;
      if (userData) {
        setUser({ ...userData, id: fbUser.uid, isAdmin: userData.role === 'admin' });
      }
      setFirebaseUser(fbUser);

      toast({ title: 'Bienvenido', description: 'Sesión iniciada correctamente' });
    } catch (err: any) {
      console.error('Error verifying phone code:', err);
      let description = 'Código de verificación inválido.';
      if (err.code === 'auth/invalid-verification-code') {
        description = 'El código ingresado es incorrecto.';
      } else if (err.code === 'auth/code-expired') {
        description = 'El código ha expirado. Solicita uno nuevo.';
      }
      toast({ variant: 'destructive', title: 'Error', description });
      throw err;
    }
  }, [toast]);

  const register = useCallback(async (name: string, email: string, pass: string, sendVerification = true, phone?: string): Promise<boolean> => {
    const { auth, db } = getFirebaseServices();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (sendVerification) await sendEmailVerification(cred.user);

      await setDoc(doc(db, 'users', cred.user.uid), {
        id: cred.user.uid,
        name,
        email,
        phone: phone || '',
        avatar: '',
        examType: null,
        studyTime: {},
        role: 'normal',
        quizzesCompleted: 0,
        qualifyingQuizzesCount: 0,
        premiumBenefitCount: 0,
        ratings: [],
        challengeAttempts: [],
        premiumPlan: null,
        premiumUntil: null,
        examsTakenThisPeriod: 0,
        viewedFreeContentIds: [],
        registeredClasses: [],
        banDetails: { isBanned: false, bannedUntil: null, reason: '', bannedAt: null },
        hasTakenDiagnosticExam: false,
        diagnosticExamResult: null,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (err: any) {
      handleAuthError(err);
      return false;
    }
  }, [toast, handleAuthError]);

  const startTrial = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const { db } = getFirebaseServices();
    try {
      const end = addDays(new Date(), 3);
      await updateDoc(doc(db, 'users', user.id), {
        premiumPlan: 'trial',
        premiumUntil: end,
        examsTakenThisPeriod: 0,
      });
      setUser(prev => prev ? { ...prev, premiumPlan: 'trial', premiumUntil: end, examsTakenThisPeriod: 0 } : prev);
      return true;
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al iniciar prueba' });
      return false;
    }
  }, [user, toast]);

  const logout = useCallback(async () => {
    const { auth } = getFirebaseServices();
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    router.push('/login');
  }, [router]);

  // === USER UPDATE ===
  const updateUser = useCallback(async (updates: Partial<User> & { newAvatarFile?: File | null }, targetUserId?: string) => {
    const { db, storage } = getFirebaseServices();
    const uid = targetUserId || user?.id;
    if (!uid) return;

    try {
      const userDocRef = doc(db, 'users', uid);
      const data: any = { ...updates };

      if (updates.newAvatarFile) {
        const avatarRef = storageRef(storage, `user-avatars/${uid}/avatar.jpg`);
        await uploadBytes(avatarRef, updates.newAvatarFile);
        data.avatar = await getDownloadURL(avatarRef);
        data.avatarLastUpdatedAt = serverTimestamp();
        delete data.newAvatarFile;
      }

      await updateDoc(userDocRef, data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al actualizar usuario' });
    }
  }, [user, toast]);

  const setExamType = useCallback(async (examType: string) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    try {
      await updateDoc(doc(db, 'users', user.id), { examType });
      setUser(prev => prev ? { ...prev, examType } : prev);
      setIsFirstLogin(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al seleccionar examen' });
    }
  }, [user, toast]);

  const addStudyTime = useCallback(async (seconds: number, subject: string) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    try {
      await updateDoc(doc(db, 'users', user.id), {
        [`studyTime.${subject}`]: increment(seconds),
      });
      setUser(prev => prev ? { ...prev, studyTime: { ...prev.studyTime, [subject]: (prev.studyTime[subject] || 0) + seconds } } : prev);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  // === EXAM RESULTS ===
  const addExamResult = useCallback(async (result: Omit<ExamResult, 'resultId'>) => {
    if (!user) return;
    const { db } = getFirebaseServices();

    try {
      const examDoc = await getDoc(doc(db, 'exams', result.examId));
      const examType = examDoc.exists() ? examDoc.data()?.type : null;

      // For non-diagnostic exams, check access limits
      if (examType !== 'diagnostico') {
        const allowed = getExamsAllowed(user.premiumPlan, user.customExamsAllowed);
        const taken = user.examsTakenThisPeriod ?? 0;
        const tokens = user.examTokens ?? 0;
        if (!user.isAdmin && allowed !== Infinity && taken >= allowed && tokens <= 0) {
          toast({ variant: 'destructive', title: 'Límite de exámenes alcanzado' });
          return;
        }
      }

      const examResult: ExamResult = { ...result, resultId: uuidv4() };
      const updates: any = {
        examResults: arrayUnion(examResult),
      };

      // Only increment for non-diagnostic exams
      if (examType !== 'diagnostico') {
        updates.examsTakenThisPeriod = increment(1);
        // Decrement examTokens if used
        if (user.examTokens && user.examTokens > 0) {
          updates.examTokens = increment(-1);
        }
      }

      if (examType === 'diagnostico') {
        updates.hasTakenDiagnosticExam = true;
        updates.diagnosticExamResult = examResult;
      }

      await updateDoc(doc(db, 'users', user.id), updates);

      if (updates.hasTakenDiagnosticExam) {
        setUser(prev => prev ? { ...prev, hasTakenDiagnosticExam: true, diagnosticExamResult: examResult } : prev);
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar resultado' });
    }
  }, [user, toast]);

  const updateExamResult = useCallback(async (resultId: string, updates: Partial<ExamResult>) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    try {
      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data() as User;
      const newResults = (userData.examResults || []).map(r =>
        r.resultId === resultId ? { ...r, ...updates } : r
      );

      await updateDoc(userRef, { examResults: newResults });

      // Force a state update to trigger re-renders
      setUser(prev => {
        if (!prev) return null;
        const updatedResults = (prev.examResults || []).map(r =>
          r.resultId === resultId ? { ...r, ...updates } : r
        );
        return { ...prev, examResults: updatedResults };
      });

    } catch (err) {
      console.error("Error updating exam result:", err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el resultado.' });
    }
  }, [user, toast, setUser]);

  const deleteExamResult = useCallback(async (resultId: string) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    try {
      const snap = await getDoc(doc(db, 'users', user.id));
      if (!snap.exists()) return;
      const data = snap.data() as User;
      const result = data.examResults?.find(r => r.resultId === resultId);
      if (!result) return;

      await updateDoc(doc(db, 'users', user.id), {
        examResults: arrayRemove(result),
      });
      setUser(prev => prev ? { ...prev, examResults: prev.examResults?.filter(r => r.resultId !== resultId) } : prev);
      toast({ title: 'Resultado eliminado' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  }, [user, toast]);

  // === QUIZZES ===
  const addQuizCompletion = useCallback(async () => {
    if (!user) return;
    const { db } = getFirebaseServices();
    try {
      await updateDoc(doc(db, 'users', user.id), { quizzesCompleted: increment(1) });
      setUser(prev => prev ? { ...prev, quizzesCompleted: (prev.quizzesCompleted || 0) + 1 } : prev);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al contar quiz' });
    }
  }, [user, toast]);

  const incrementReadingsCompleted = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    const { db } = getFirebaseServices();
    try {
      await updateDoc(doc(db, 'users', uid), { readingsCompleted: increment(1) });
      setUser(prev => prev ? { ...prev, readingsCompleted: (prev.readingsCompleted || 0) + 1 } : prev);
    } catch (err) {
      console.error('Error incrementing readings:', err);
    }
  }, [user?.id]); // Only change if ID changes

  const incrementMultimediaWatched = useCallback(async (contentId?: string) => {
    const uid = user?.id;
    if (!uid) return;
    const { db } = getFirebaseServices();

    console.log('🎬 incrementMultimediaWatched called with ID:', contentId);

    // Auto-healing: If the user's count is 0, it means they likely reset their progress.
    // We should ensure the local tracking is also reset so they can start over.
    if ((user.multimediaWatched || 0) === 0) {
      localStorage.removeItem('countedMultimediaIds');
    }

    // Protection logic: if an ID is provided, check if it has already been counted
    if (contentId) {
      const countedMultimedia = JSON.parse(localStorage.getItem('countedMultimediaIds') || '[]');
      console.log('📊 Current countedMultimediaIds:', countedMultimedia);

      if (countedMultimedia.includes(contentId)) {
        console.log('⚠️ Already counted, skipping:', contentId);
        return; // Already counted, skip
      }

      countedMultimedia.push(contentId);
      localStorage.setItem('countedMultimediaIds', JSON.stringify(countedMultimedia));
      console.log('✅ Added to countedMultimediaIds:', contentId);
    }

    try {
      console.log('🔄 Updating Firestore...');
      await updateDoc(doc(db, 'users', uid), { multimediaWatched: increment(1) });
      setUser(prev => prev ? { ...prev, multimediaWatched: (prev.multimediaWatched || 0) + 1 } : prev);
      console.log('✅ Firestore updated successfully');
    } catch (err) {
      console.error('❌ Error incrementing multimedia:', err);
    }
  }, [user?.id, user?.multimediaWatched]); // Added user.multimediaWatched to dependency array
  // Only change if ID changes

  const handleQuizCompletion = useCallback(async (score: number, totalQuestions: number) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    const percentage = (score / totalQuestions) * 100;
    if (percentage < 90) {
      await addQuizCompletion();
      return;
    }

    try {
      const snap = await getDoc(doc(db, 'users', user.id));
      if (!snap.exists()) return;
      const data = snap.data();

      const now = new Date();
      const premiumUntil = timestampToDate(data.premiumUntil);
      const isPremium = premiumUntil && premiumUntil > now;

      if (isPremium || (data.premiumBenefitCount || 0) >= 6) {
        await addQuizCompletion();
        return;
      }

      const qualifying = (data.qualifyingQuizzesCount || 0) + 1;
      const updates: any = {
        quizzesCompleted: increment(1),
        qualifyingQuizzesCount: qualifying,
      };

      if ([10, 20, 25].includes(qualifying)) {
        const newCount = (data.premiumBenefitCount || 0) + 1;
        const end = new Date(now.getTime() + 10 * 60 * 1000);
        updates.premiumUntil = end;
        updates.premiumBenefitCount = newCount;
        if (qualifying === 25) updates.qualifyingQuizzesCount = 0;

        setMilestoneReward({ quizzes: qualifying, minutes: 10 });
        setShowQuizMilestoneModal(true);
      }

      await updateDoc(doc(db, 'users', user.id), updates);
      setUser(prev => prev ? { ...prev, ...updates } : prev);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error en quiz' });
    }
  }, [user, addQuizCompletion, toast]);

  // === CHALLENGES ===
  const saveChallengeAttempt = useCallback(async (attempt: Omit<UserChallengeAttempt, 'challengeId' | 'userId' | 'userName' | 'userAvatar' | 'date'>) => {
    if (!user) return;
    const { db } = getFirebaseServices();
    const today = new Date().toISOString().split('T')[0];
    const attemptData: UserChallengeAttempt = {
      ...attempt,
      challengeId: uuidv4(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      date: today,
    };

    await updateDoc(doc(db, 'users', user.id), {
      challengeAttempts: arrayUnion(attemptData),
    });
  }, [user]);

  const hasAttemptedToday = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const today = new Date().toISOString().split('T')[0];
    return user.challengeAttempts?.some(a => a.date === today) || false;
  }, [user]);

  // === PODCAST & MODALS ===
  const playPodcast = useCallback((podcast: ContentItem) => {
    setActivePodcast(podcast);
    setIsPodcastPlaying(true);
    setIsPlayerMinimized(false);

    // Mark podcast as viewed
    if (podcast?.id) {
      const completedContentIds: string[] = JSON.parse(localStorage.getItem('completedContentIds') || '[]');
      if (!completedContentIds.includes(podcast.id)) {
        completedContentIds.push(podcast.id);
        localStorage.setItem('completedContentIds', JSON.stringify(completedContentIds));
        window.dispatchEvent(new CustomEvent('contentCompleted', { detail: { id: podcast.id } }));
      }

      // Increment multimedia watched counter only once
      incrementMultimediaWatched(podcast.id);
    }
  }, [incrementMultimediaWatched]);

  const togglePodcast = useCallback(() => setIsPodcastPlaying(p => !p), []);
  const stopPodcast = useCallback(() => { setIsPodcastPlaying(false); setActivePodcast(null); }, []);
  const togglePlayerMinimized = useCallback(() => setIsPlayerMinimized(p => !p), []);
  const restorePlayer = useCallback(() => setIsPlayerMinimized(false), []);
  const closeQuizMilestoneModal = useCallback(() => {
    setShowQuizMilestoneModal(false);
    setMilestoneReward(null);
  }, []);

  // === RETURN ===
  const value: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    isLoading,
    setIsLoading,
    isFirstLogin,
    needsProfileSetup,
    setIsFirstLogin,
    setNeedsProfileSetup,
    login,
    loginWithGoogle,
    sendPhoneVerification,
    verifyPhoneCode,
    register,
    logout,
    startTrial,
    updateUser,
    setExamType,
    addStudyTime,
    addExamResult,
    updateExamResult,
    deleteExamResult,
    addQuizCompletion,
    incrementReadingsCompleted,
    incrementMultimediaWatched,
    handleQuizCompletion,
    addRating: async (r, c) => {
      if (!user) return;
      const { db } = getFirebaseServices();
      const rating: Rating = { rating: r, comment: c, date: new Date() };
      await updateDoc(doc(db, 'users', user.id), { ratings: arrayUnion(rating) });
      setUser(prev => prev ? { ...prev, ratings: [...(prev.ratings || []), rating] } : prev);
    },
    saveChallengeAttempt,
    hasAttemptedToday,
    setPremiumForDays: async (uid, days, numTokens) => {
      if (!user) return;
      const { db } = getFirebaseServices();
      const userDocRef = doc(db, 'users', uid);

      // Treat null or 0 as deactivation
      if (days === null || days === 0) {
        // --- DEACTIVATION ---
        await updateDoc(userDocRef, {
          premiumPlan: null,
          premiumUntil: null,
          examsTakenThisPeriod: 0,
          customExamsAllowed: null
        });

        // Update local state if target is current user (unlikely for admin action but safe)
        if (user.id === uid) {
          setUser(prev => prev ? { ...prev, premiumPlan: null, premiumUntil: null, examsTakenThisPeriod: 0, customExamsAllowed: undefined } : prev);
        }

        try {
          // 1. In-App Notification
          const notificationId = uuidv4();
          await setDoc(doc(db, 'notifications', notificationId), {
            id: notificationId,
            title: '¡Premium Desactivado!',
            description: 'Tu tiempo de acceso premium ha terminado. Obtén más días contactándonos por WhatsApp aquí.',
            type: 'info',
            read: false,
            createdAt: serverTimestamp(),
            recipientIds: [uid],
            url: `https://wa.me/525619764631?text=${encodeURIComponent('Hola, mi periodo premium terminó. Me gustaría obtener más días de acceso.')}`,
            imageUrl: '/images/premium-deactivated.png',
            source: 'system'
          });

          // 2. Push Notification
          await fetch('/api/notifications/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '¡Premium Desactivado!',
              description: 'Tu tiempo de premium ha terminado. Obtén más días por WhatsApp aquí.',
              recipientIds: [uid],
              url: `https://wa.me/525619764631?text=${encodeURIComponent('Hola, mi periodo premium terminó. Me gustaría obtener más días de acceso.')}`,
              imageUrl: '/images/premium-deactivated.png'
            }),
          });
        } catch (error) {
          console.error('Error sending deactivation notifications:', error);
        }

      } else {
        // --- ACTIVATION ---
        const endDate = addDays(new Date(), days);
        await updateDoc(userDocRef, {
          premiumPlan: 'custom',
          premiumUntil: endDate,
          examsTakenThisPeriod: 0,
          examTokens: numTokens || 0
        });

        if (user.id === uid) {
          setUser(prev => prev ? { ...prev, premiumPlan: 'custom', premiumUntil: endDate, examsTakenThisPeriod: 0, examTokens: numTokens || 0 } : prev);
        }

        try {
          // 1. In-App Notification
          const notificationId = uuidv4();
          await setDoc(doc(db, 'notifications', notificationId), {
            id: notificationId,
            title: '¡Felicidades! Premium Activado',
            description: `Se activo el premium en tu perfil por ${days} días. Disfruta de todos los beneficios.`,
            type: 'success',
            read: false,
            createdAt: serverTimestamp(),
            recipientIds: [uid],
            url: `/?modal=premium_activation&days=${days}&tokens=${numTokens || 0}`,
            imageUrl: '/images/premium-activated.jpg',
            source: 'system'
          });

          // 2. Push Notification
          await fetch('/api/notifications/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: '¡Felicidades! Premium Activado',
              description: `Se activo el premium en tu perfil por ${days} días.`,
              recipientIds: [uid],
              url: `/?modal=premium_activation&days=${days}&tokens=${numTokens || 0}`,
              imageUrl: '/images/premium-activated.jpg'
            }),
          });
        } catch (error) {
          console.error('Error sending activation notifications:', error);
        }
      }
    },
    createSupportTicket: async (subject) => {
      if (!user) return null;
      const { db } = getFirebaseServices();
      const id = uuidv4();

      // Create the first message from the user using the subject
      const firstMessage: SupportMessage = {
        id: uuidv4(),
        senderId: user.id,
        text: subject,
        createdAt: new Date(),
        readBy: [user.id]
      };

      await setDoc(doc(db, 'supportTickets', id), {
        id,
        userId: user.id,
        subject,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: [firstMessage]
      });
      return id;
    },
    sendSupportMessage: async (tid, text, sid) => {
      if (!user) return;
      const { db } = getFirebaseServices();

      await updateDoc(doc(db, 'supportTickets', tid), {
        messages: arrayUnion({ id: uuidv4(), senderId: sid, text, createdAt: new Date(), readBy: [sid] }),
        updatedAt: serverTimestamp(),
      });

      // If the message is from support (admin), send notifications to the user
      if (sid === 'admin') {
        try {
          // Get the ticket to find the userId
          const ticketSnap = await getDoc(doc(db, 'supportTickets', tid));
          if (ticketSnap.exists()) {
            const ticketData = ticketSnap.data() as SupportTicket;
            const targetUserId = ticketData.userId;

            // 1. Create In-App Notification
            const notificationId = uuidv4();
            await setDoc(doc(db, 'notifications', notificationId), {
              id: notificationId,
              title: 'Nueva respuesta de Soporte',
              message: text.length > 50 ? text.substring(0, 50) + '...' : text,
              type: 'info',
              read: false,
              createdAt: serverTimestamp(),
              recipientIds: [targetUserId],
              url: `/profile?tab=help&ticketId=${tid}`, // URL handles deep linking
              imageUrl: '/support-icon.png', // Custom support icon
              source: 'support'
            });

            // 2. Send Push Notification via API
            await fetch('/api/notifications/send-push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: 'Soporte Luni',
                description: `Respuesta: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`,
                recipientIds: [targetUserId],
                url: `/profile?tab=help&ticketId=${tid}`,
                imageUrl: '/support-icon.png' // Custom support icon
              }),
            });

            console.log('[SUPPORT] Notifications sent to user', targetUserId);
          }
        } catch (error) {
          console.error('[SUPPORT] Error sending notifications:', error);
        }
      }
    },
    getSupportTickets: async () => {
      if (!user) return [];
      const { db } = getFirebaseServices();
      const q = query(collection(db, 'supportTickets'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as SupportTicket);
    },
    markTicketAsRead: async (tid) => {
      if (!user) return;
      const { db } = getFirebaseServices();
      const snap = await getDoc(doc(db, 'supportTickets', tid));
      if (!snap.exists()) return;
      const data = snap.data() as SupportTicket;
      const msgs = data.messages.map(m => ({
        ...m,
        readBy: m.readBy?.includes(user.id) ? m.readBy : [...(m.readBy || []), user.id]
      }));
      await updateDoc(doc(db, 'supportTickets', tid), { messages: msgs });
    },
    resolveSupportTicket: async (tid) => {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, 'supportTickets', tid), { status: 'closed', updatedAt: serverTimestamp() });
    },
    reopenSupportTicket: async (tid) => {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, 'supportTickets', tid), { status: 'open', updatedAt: serverTimestamp() });
    },
    submitTicketRating: async (tid, r, c) => {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, 'supportTickets', tid), {
        csat: { rating: r, comment: c || '', date: new Date(), ratedAt: new Date() },
        updatedAt: serverTimestamp(),
      });
    },
    banUser: async (uid, reason, until) => {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, 'users', uid), {
        banDetails: { isBanned: true, bannedUntil: until, reason, bannedAt: serverTimestamp() }
      });
    },
    unbanUser: async (uid) => {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, 'users', uid), {
        banDetails: { isBanned: false, bannedUntil: null, reason: '', bannedAt: null }
      });
    },
    markFreeContentAsViewed: async (cid) => {
      if (!user) return;
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, 'users', user.id), { viewedFreeContentIds: arrayUnion(cid) });
      setUser(prev => prev ? { ...prev, viewedFreeContentIds: [...(prev.viewedFreeContentIds || []), cid] } : prev);
    },
    playPodcast,
    togglePodcast,
    stopPodcast,
    activePodcast,
    isPodcastPlaying,
    isPlayerMinimized,
    togglePlayerMinimized,
    restorePlayer,
    showQuizMilestoneModal,
    milestoneReward,
    closeQuizMilestoneModal,
    isContentModalOpen,
    setIsContentModalOpen,
    isQuizModalOpen,
    setIsQuizModalOpen,
    resetStudyTime: async () => {
      if (!user) return;
      const { db } = getFirebaseServices();
      try {
        await updateDoc(doc(db, 'users', user.id), { studyTime: {} });
        toast({ title: "Tiempo Restablecido", description: "Tu tiempo de estudio ha sido reiniciado." });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error" });
      }
    },
    resetQuizzesCompleted: async () => {
      if (!user) return;
      const { db } = getFirebaseServices();
      try {
        await updateDoc(doc(db, 'users', user.id), { quizzesCompleted: 0 });
        toast({ title: "Contador Restablecido", description: "Tus quizzes completados han vuelto a cero." });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error" });
      }
    },
    resetReadingsCompleted: async () => {
      if (!user) return;
      const { db } = getFirebaseServices();
      try {
        await updateDoc(doc(db, 'users', user.id), { readingsCompleted: 0 });
        localStorage.removeItem('countedReadingIds');
        toast({ title: "Contador Restablecido", description: "Tus lecturas completadas han vuelto a cero." });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error" });
      }
    },
    resetMultimediaWatched: async () => {
      if (!user) return;
      const { db } = getFirebaseServices();
      try {
        await updateDoc(doc(db, 'users', user.id), { multimediaWatched: 0 });
        localStorage.removeItem('countedMultimediaIds');
        toast({ title: "Contador Restablecido", description: "Tu contenido multimedia visto ha vuelto a cero." });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error" });
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
