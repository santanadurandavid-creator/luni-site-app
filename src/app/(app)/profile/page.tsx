'use client';

import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { StudyTimeCard } from '@/components/profile/StudyTimeCard';
import { StudyDistributionChart } from '@/components/profile/StudyDistributionChart';
import { ProfileSetupModal } from '@/components/auth/ProfileSetupModal';

import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { AvailableExams } from '@/components/profile/AvailableExams';
import { useAuth } from '@/hooks/use-auth';
import { RecentResults } from '@/components/profile/RecentResults';
import { QuizzesCompletedCard } from '@/components/profile/QuizzesCompletedCard';
import { ReadingsCompletedCard } from '@/components/profile/ReadingsCompletedCard';
import { MultimediaWatchedCard } from '@/components/profile/MultimediaWatchedCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DynamicPurchaseSimulatorModal, DynamicRankingModal, DynamicVideoOfTheDayModal } from '@/components/shared/dynamic';
import { BannerAd } from '@/components/ads/AdManager';

export default function ProfilePage() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const { user, needsProfileSetup, setNeedsProfileSetup } = useAuth();

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-2 sm:space-y-4">
        <ProfileHeaderCard
          onOpenRankingModal={() => setIsRankingModalOpen(true)}
          onOpenVideoModal={() => setIsVideoModalOpen(true)}
          onOpenPurchaseModal={() => setIsPurchaseModalOpen(true)}
        />

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <StudyTimeCard />
          <QuizzesCompletedCard />
          <ReadingsCompletedCard />
          <MultimediaWatchedCard />
        </div>

        {/* Distribución de Estudio - Tiempo de estudio por materia */}
        <StudyDistributionChart />



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-2xl font-bold font-headline mb-4">Resultados Recientes</h3>
              <RecentResults />
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-muted-foreground group-hover:text-foreground transition-colors">Mis Exámenes</CardTitle>
                <CardDescription>Inicia un examen de simulación para poner a prueba tus conocimientos.</CardDescription>
              </CardHeader>
              <CardContent>
                <AvailableExams />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
      <ProfileSetupModal
        isOpen={needsProfileSetup}
        onComplete={() => setNeedsProfileSetup(false)}
      />
      <DynamicPurchaseSimulatorModal
        isOpen={isPurchaseModalOpen}
        setIsOpen={setIsPurchaseModalOpen}
        isFromPremiumButton={true}
      />
      <DynamicRankingModal
        isOpen={isRankingModalOpen}
        setIsOpen={setIsRankingModalOpen}
      />
      <DynamicVideoOfTheDayModal
        isOpen={isVideoModalOpen}
        setIsOpen={setIsVideoModalOpen}
      />
      <BannerAd section="profile" />
    </>
  );
}
