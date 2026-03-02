
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const DynamicAnnouncementModal = dynamic(() => import('@/components/updates/AnnouncementModal').then(mod => mod.AnnouncementModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicContentModal = dynamic(() => import('@/components/content/ContentModal').then(mod => mod.ContentModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicVideoModal = dynamic(() => import('@/components/content/VideoModal').then(mod => mod.VideoModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicEditContentModal = dynamic(() => import('@/components/admin/EditContentModal').then(mod => mod.EditContentModal), {
  loading: () => <LoadingSpinner />,
  ssr: false, 
});

export const DynamicPurchaseSimulatorModal = dynamic(() => import('@/components/profile/PurchaseSimulatorModal').then(mod => mod.PurchaseSimulatorModal), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

export const DynamicQuizPlayerModal = dynamic(() => import('@/components/quizzes/QuizPlayerModal').then(mod => mod.QuizPlayerModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicDailyChallengeModal = dynamic(() => import('@/components/profile/DailyChallengeModal').then(mod => mod.DailyChallengeModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicRankingModal = dynamic(() => import('@/components/profile/RankingModal').then(mod => mod.RankingModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicResultDetailsModal = dynamic(() => import('@/lib/ResultDetailsModal').then(mod => mod.ResultDetailsModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicEditProfileModal = dynamic(() => import('@/components/profile/EditProfileModal').then(mod => mod.EditProfileModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicExamSelectionModal = dynamic(() => import('@/components/profile/ExamSelectionModal').then(mod => mod.ExamSelectionModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicIosInstallPrompt = dynamic(() => import('@/components/pwa/IosInstallPrompt').then(mod => mod.IosInstallPrompt), {
  loading: () => <LoadingSpinner />,
});

export const DynamicRatingModal = dynamic(() => import('@/components/profile/RatingModal').then(mod => mod.RatingModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicHelpModal = dynamic(() => import('@/components/profile/HelpModal').then(mod => mod.HelpModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicUrlContentModal = dynamic(() => import('@/components/shared/UrlContentModal').then(mod => mod.UrlContentModal), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

export const DynamicBanUserModal = dynamic(() => import('@/components/admin/BanUserModal').then(mod => mod.BanUserModal), {
    loading: () => <LoadingSpinner />,
    ssr: false,
});

export const DynamicAgentStatsModal = dynamic(() => import('@/components/admin/AgentStatsModal').then(mod => mod.AgentStatsModal), {
    loading: () => <LoadingSpinner />,
    ssr: false,
});

export const DynamicVideoOfTheDayModal = dynamic(() => import('@/components/profile/VideoOfTheDayModal').then(mod => mod.VideoOfTheDayModal), {
  loading: () => <LoadingSpinner />,
});

export const DynamicPremiumContentModal = dynamic(() => import('@/components/profile/PremiumContentModal').then(mod => mod.PremiumContentModal), {
    loading: () => <LoadingSpinner />,
});

export const DynamicDiagnosticExamModal = dynamic(() => import('@/components/profile/DiagnosticExamModal').then(mod => mod.DiagnosticExamModal), {
    loading: () => <LoadingSpinner />,
});

export const DynamicReviewModal = dynamic(() => import('@/components/profile/ReviewModal').then(mod => mod.ReviewModal), {
    loading: () => <LoadingSpinner />,
    ssr: false,
});

export const DynamicStartExamModal = dynamic(() => import('@/components/profile/StartExamModal').then(mod => mod.StartExamModal), {
    loading: () => <LoadingSpinner />,
    ssr: false,
});
