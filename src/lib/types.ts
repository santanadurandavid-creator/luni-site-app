'use client';

import { z } from 'zod';

export type UserRole = 'normal' | 'support' | 'admin' | 'supervisor_support' | 'content_creator' | 'ventas';

export interface BanDetails {
  isBanned: boolean;
  bannedUntil?: any; // Timestamp
  reason?: string;
  bannedAt?: any; // Timestamp
}

export interface Rating {
  rating: number;
  comment?: string;
  date: any;
}

export interface UserChallengeAttempt {
  challengeId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  score: number;
  timeTaken: number; // in seconds
  completedAt: any;
  date: string;
}

export interface TeacherDetails {
  professionalId?: string;
  experience?: string;
  expertSubjects?: string[];
}

export interface User {
  id: string; // Firebase UID
  userId?: string;
  referralId?: string; // New referral ID field
  name: string;
  email: string;
  phone?: string; // Phone number
  avatar: string;
  examType: string | null;
  studyTime: Record<string, number>; // in seconds, per subject
  isAdmin?: boolean;
  role: UserRole | null;
  examResults?: ExamResult[];
  quizzesCompleted?: number;
  qualifyingQuizzesCount?: number; // Added for premium quiz tracking
  premiumBenefitCount?: number; // Added for premium benefit count
  ratings?: Rating[];
  avatarLastUpdatedAt?: any;
  challengeAttempts?: UserChallengeAttempt[];
  registeredClasses?: string[]; // Array of class IDs
  banDetails?: BanDetails;
  premiumUntil?: any; // Timestamp, null if not premium
  premiumPlan?: '10-day' | '30-day' | '60-day' | 'permanent' | 'trial' | 'custom' | null;
  examsTakenThisPeriod?: number;
  customExamsAllowed?: number;
  viewedFreeContentIds?: string[];
  examTokens?: number; // Added for exam tokens
  miniTokens?: number; // Added for mini tokens
  teacherDetails?: TeacherDetails; // Added for teacher details
  teacherStatus?: 'pending' | 'active' | 'rejected'; // Added for teacher status
  hasTakenDiagnosticExam?: boolean; // Added for diagnostic exam tracking
  diagnosticExamResult?: ExamResult | null; // Added for diagnostic exam result
  referredBy?: string; // ID of the user who referred this user
  referrals?: string[]; // Array of user IDs referred by this user
  examDate?: any; // Timestamp for scheduled exam date
  examDateChangesCount?: number; // Number of times exam date has been changed
  lastExamDateChange?: any; // Timestamp of last exam date change
  examScore?: number; // Score from exam feedback
  examFeedback?: string; // Feedback text from exam
  lastLogin?: any; // Timestamp
  lastSeen?: any; // Timestamp
  studyPlan?: {
    examDate: string;
    studyHoursPerDay: number;
  };
  fcmToken?: string;
  lastFcmUpdate?: any;
  planGenerationsCount?: number; // Number of study plans generated in current period
  lastPlanGenerationReset?: any; // Timestamp of last reset for monthly counter
  lastActivity?: any; // Timestamp of last user activity
  createdAt?: any; // Timestamp of when the user was created
  readingsCompleted?: number; // Added for tracking reading sessions > 3 mins
  multimediaWatched?: number; // Added for tracking visual/audio content views
  unlockedSubjects?: string[]; // List of subjects the user has premium access to
}

export type ContentType = 'video' | 'content' | 'quiz' | 'class' | 'podcast';

export type ContentCategory = 'Todos' | 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías' | 'Área 2: Ciencias Biológicas, Químicas y de la Salud' | 'Área 3: Ciencias Sociales' | 'Área 4: Humanidades y de las Artes';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  imageUrl?: string | null;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string | null;
}

export interface QuizDetails {
  questions: QuizQuestion[];
  backgroundColor?: string;
  backgroundImageUrl?: string;
  backgroundImageOpacity?: number; // Value between 0 and 1
  textColor?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: any;
  readBy?: string[];
}

// Professor Interface
export interface Professor {
  id: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  rating: number;     // Average rating (e.g., 4.8)
  totalRatings: number; // Total number of reviews received
  createdAt: any;
}

export interface ClassDetails {
  isLive: boolean;
  status: 'pending' | 'scheduled' | 'live' | 'finished';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  classDate?: any; // Timestamp for live classes
  finishedAt?: any; // Timestamp for when the class was finished
  registeredUsers?: string[]; // UIDs of registered users
  streamUrl?: string; // This will now be the Google Meet link (or YouTube, Zoom)
  mutedUsers?: string[]; // UIDs of muted users
  // New fields for live classes
  classSubject?: string; // Materia de la clase
  classTime?: string; // Hora de la clase (ej: "18:00")
  classDay?: string; // Día de la clase (ej: "Lunes", "2024-12-15")
  classCost?: number; // Costo de la clase
  professorId?: string; // ID del profesor vinculado
  professorName?: string; // Nombre del profesor (Snapshotted or fetched)
  professorAvatar?: string; // Foto del profesor (Snapshotted or fetched)
  maxCapacity?: number; // Cupo máximo
  availableSpots?: number; // Lugares disponibles
  classDuration?: string; // Duración de la clase (texto libre)
  // Attendance tracking
  attendance?: {
    userId: string;
    attended: boolean;
    markedAt: any; // Timestamp
  }[];
}

export interface InteractiveQuestion {
  id: string;
  enabled: boolean;
  questionText: string;
  questionImageUrl?: string;
  options: QuizOption[];
  explanation: {
    title: string;
    content: string;
    imageUrl?: string;
  }[];
  linkedQuizId?: string;
}

export interface ContentBlock {
  type: 'title' | 'subTitle' | 'paragraph' | 'tip' | 'highlight' | 'image' | 'example' | 'summary' | 'list' | 'table' | 'step' | 'divider' | 'info' | 'question';
  content: string | string[] | { headers: string[]; rows: string[][] };
}

export interface ExplanatoryContentBlock {
  id: string;
  type: 'text' | 'image';
  value: string;
}

export interface InteractiveContent {
  splashTitle: string;
  splashBackgroundImageUrl: string;
  initialQuestion?: string;
  initialOptions?: string[];
  initialBackgroundImageUrl?: string;
  menuButtons?: { label: string; icon: string }[];
  menuBackgroundImageUrl?: string;
  explanatory: {
    title: string;
    htmlContent?: string; // Legacy support
    blocks?: ContentBlock[]; // Modern block-based content
    blocksJson?: string; // Flat JSON string for Firestore compatibility
    generatedClassText?: string; // Pre-generated AI class script
    audioUrl?: string; // Manually uploaded audio class
  };
  explanatoryBackgroundImageUrl?: string;
  flashcards?: { front: string; back: string }[];
  flashcardsBackgroundImageUrl?: string;
  linkedQuizId?: string;
  linkedVideoId?: string;
  linkedPodcastId?: string;
}

export interface ContentItem {
  id?: string;
  title: string;
  subject: string;
  type: ContentType;
  category: ContentCategory;
  accessLevel: 'free' | 'premium';
  contentUrl?: string;
  imageUrl?: string | null;
  interactiveContent?: InteractiveContent;
  quizDetails?: {
    questions: QuizQuestion[];
    backgroundColor?: string;
    backgroundImageUrl?: string;
    backgroundImageOpacity?: number;
    textColor?: string;
  };
  classDetails?: ClassDetails;
  views?: number;
  showAd?: boolean; // Whether to show ad for free content access (AdPromptModal)
  adUrl?: string; // URL of the ad that opens the direct link
  showBanner?: boolean; // Whether to show banner at bottom of modal (independent from showAd)
  bannerType?: 'image' | 'script'; // Type of banner to show at bottom of modal
  bannerImageUrl?: string; // URL of the banner image
  bannerClickUrl?: string; // URL to open when clicking the banner image
  bannerScript?: string; // HTML script for the banner
  createdAt?: any; // Timestamp for when the content was created
  isAIGenerated?: boolean; // Flag to identify AI-generated content
  generationBatchId?: string; // ID to group content from same generation session
  sourceGuideId?: string; // Reference to the study guide used for generation
  order?: number; // For manual ordering
  showInLanding?: boolean; // Whether to show this content in the landing page
  isVisible?: boolean; // Whether this content is visible to normal users (admins can always see it)
  generationMetadata?: { // Metadata to recreate AI-generated content
    questionText: string;
    questionImageUrl?: string | null;
    options: string[];
    correctAnswer: string;
    questionNumber: string | number;
    subjectName: string;
    area: string;
    sourceReadingText?: string;
  };
  pdfUrl?: string | null; // URL of the uploaded PDF document
  spotifyUrl?: string | null; // URL of the Spotify episode for embedding
  // ... otros campos
}

export interface Exam {
  id: string;
  title: string;
  name?: string;
  area?: string;
  type?: string;
  questions: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  answer?: string;
  linkedContentId?: string;
  subjectId?: string;
  imageUrl?: string;
  feedback?: string;
  // Optional banner for this specific question
  bannerImageUrl?: string;
  bannerClickUrl?: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  userId: string;
  score: number;
  answers: UserAnswer[];
  learnedQuestionIds?: string[];
  resultId?: string;
  examName?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  completedAt?: any;
  timeTaken?: number;
  isArchived?: boolean;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answer?: string;
}

export interface UpdateInfo {
  id: string;
  title: string;
  content: string;
  description?: string;
  date: any;
  imageUrl?: string;
  contentType: 'url' | 'html';
  contentUrl?: string;
  contentHtml?: string;
  createdAt?: any;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
  updatedAt: any;
  assignedTo?: string;
  messages: SupportMessage[];
  lastMessage?: string;
  csat?: CsatRating;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  readBy?: string[];
}

export interface CsatRating {
  rating: number;
  comment?: string;
  date: any;
  ratedAt?: any;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  category: string;
  profileHeaderBackground?: string;
  profileHeaderImageOpacity?: number;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  tiktokUrl?: string;
  contactEmail?: string;
  termsUrl?: string;
  welcomeModalImageUrl?: string;
  welcomeModalText?: string;
  loginScreenImageUrl?: string;
  tutorialVideoUrl?: string;
  termsContent?: any;
  privacyContent?: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: any;
  description?: string;
  imageUrl?: string;
  url?: string;
  recipientIds?: string[];
  scheduledFor?: any; // Timestamp for scheduled notifications
  isScheduled?: boolean; // Whether this notification is scheduled
  sentAt?: any; // Timestamp when the notification was actually sent
  source?: string;
}

export interface Avatar {
  id: string;
  url: string;
  name: string;
}

export interface Sale {
  id: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  amount: number;
  item: string;
  createdAt: any;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  date: string;
  questions: QuizQuestion[];
}

export interface StudyData {
  date: string;
  time: number;
  subject: string;
  materia: string;
  tiempo: number;
}

export interface StudyGuide {
  id: string;
  area: ContentCategory;
  fileName: string;
  url: string;
  uploadedAt: any;
}

export interface DetectedSubject {
  id: string;
  name: string;
  questionCount: number;
  questions: Array<{
    id?: string;
    text: string;
    imageUrl?: string | null;
    options?: string[] | { text: string; imageUrl?: string }[];
    answer?: string;
    selected?: boolean;
    requiresReading?: boolean;
    originalIndex?: number | string; // Allow string in case AI returns "45"
  }>;
  selected: boolean;
}

export interface GuideAnalysisResult {
  area: ContentCategory;
  subjects: DetectedSubject[];
  totalQuestions: number;
}

export type AdPlacement = 'modal' | 'banner';
export type AdSection = 'all' | 'quizzes' | 'content' | 'exams' | 'profile' | 'classes' | 'news' | 'challenges_modal' | 'duel_modal';
export type AdType = 'script' | 'image';

export interface Advertisement {
  id: string;
  name: string;
  type: AdType;

  // Script type
  scriptContent?: string;

  // Image type
  imageUrl?: string;
  clickUrl?: string;

  // Placement
  placement: AdPlacement;
  section?: AdSection;

  // Status
  isActive: boolean;
  priority: number;

  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

export interface Guide {
  id: string;
  title: string;
  description?: string;
  pdfUrl?: string; // Optional, for legacy PDF guides
  content?: string; // Text content of the guide (added for text-based guides)
  topics?: string[]; // Array of topic strings extracted from the PDF
  area: number; // 1, 2, 3, or 4
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

// Challenge/Duel System Types
export type ChallengeStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'in_progress' | 'completed' | 'cancelled';

export interface ChallengeQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  imageUrl?: string;
  subject: string;
}

export interface ChallengeAnswer {
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  answeredAt: any; // Timestamp
}

export interface ChallengeParticipant {
  userId: string;
  userName: string;
  userAvatar: string;
  answers: ChallengeAnswer[];
  score: number;
  completedAt?: any; // Timestamp
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerAvatar: string;
  challengedId: string;
  challengedName: string;
  challengedAvatar: string;
  status: ChallengeStatus;
  guideId: string;
  guideName: string;
  questions: ChallengeQuestion[];
  challenger: ChallengeParticipant;
  challenged: ChallengeParticipant;
  winnerId?: string;
  createdAt: any; // Timestamp
  expiresAt: any; // Timestamp - 10 minutes from creation
  acceptedAt?: any; // Timestamp
  completedAt?: any; // Timestamp
}

export interface ChallengeStats {
  userId: string;
  totalChallenges: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageScore: number;
}

export interface ClassRating {
  id?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  ratings: {
    teachingQuality: number; // Calidad de enseñanza
    topicClarity: number; // Claridad del tema
    supportMaterial: number; // Material de apoyo
    generalExperience: number; // Experiencia general
  };
  comment: string;
  createdAt: any;
}

export interface UserInteraction {
  id: string;
  userId: string;
  type: 'call' | 'email' | 'whatsapp' | 'other';
  status: 'answered' | 'no_answer' | 'interested' | 'not_interested' | 'premium_purchased' | 'follow_up_needed';
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface StaffTask {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  assignedToRole: UserRole;
  createdById: string;
  createdByName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: any; // Timestamp
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  report?: string; // Feedback from the assigned user
  progress: number; // 0-100
}
