import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseSimulatorModal } from '@/components/profile/PurchaseSimulatorModal';
import { AdPromptModal } from './AdPromptModal';
import { AdRenderer } from './AdRenderer';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Advertisement } from '@/lib/types';

const AdManager: React.FC = () => {
  const authContext = useContext(AuthContext);
  const [showPopupAd, setShowPopupAd] = useState(false);
  const [currentModalAd, setCurrentModalAd] = useState<Advertisement | null>(null);
  const [modalAds, setModalAds] = useState<Advertisement[]>([]);
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAdPrompt, setShowAdPrompt] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modalAdIndexRef = useRef(0);

  if (!authContext) return null;
  const { user } = authContext;

  const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();

  // Load modal ads from Firestore
  useEffect(() => {
    const { db } = getFirebaseServices();
    const adsRef = collection(db, 'advertisements');
    const q = query(
      adsRef,
      where('placement', '==', 'modal'),
      where('isActive', '==', true),
      orderBy('priority', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Advertisement[];
      setModalAds(ads);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !isPremium && modalAds.length > 0) {
      const showAd = () => {
        // Get next ad in rotation
        const ad = modalAds[modalAdIndexRef.current % modalAds.length];
        setCurrentModalAd(ad);
        setShowPopupAd(true);
        setCanClose(false);
        setCountdown(10);

        // Move to next ad for next time
        modalAdIndexRef.current++;
      };

      // First ad after 200 seconds
      intervalRef.current = setTimeout(() => {
        showAd();
        // Then cycle every 200s
        const cycleAd = () => {
          intervalRef.current = setTimeout(() => {
            showAd();
            cycleAd();
          }, 200000);
        };
        cycleAd();
      }, 200000);

      return () => {
        if (intervalRef.current) clearTimeout(intervalRef.current);
      };
    }
  }, [user, isPremium, modalAds]);

  // Separate useEffect for countdown - ensures it always starts when modal opens
  useEffect(() => {
    if (showPopupAd && !canClose) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(countdownIntervalRef.current!);
            setCanClose(true);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [showPopupAd, canClose]);

  if (!user || isPremium) {
    return null;
  }

  return (
    <>
      <Dialog open={showPopupAd} onOpenChange={(open) => { if (canClose) setShowPopupAd(open); }}>
        <DialogContent className="max-w-fit max-h-fit flex flex-col items-center justify-center p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Anuncio</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center">
            {currentModalAd && <AdRenderer ad={currentModalAd} />}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {canClose ? 'Puedes cerrar este anuncio ahora.' : `Puedes cerrar este anuncio en ${countdown} segundos.`}
          </p>
          <div className="flex flex-col gap-2 mt-4 w-full">
            {canClose && (
              <Button
                onClick={() => setShowPopupAd(false)}
                variant="default"
              >
                Cerrar Anuncio
              </Button>
            )}
            <Button
              onClick={() => setShowPremiumModal(true)}
              variant={canClose ? "outline" : "default"}
            >
              Obtener Premium para no ver anuncios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AdPromptModal
        isOpen={showAdPrompt}
        onClose={() => setShowAdPrompt(false)}
        onWatchAd={() => { }}
      />
      <PurchaseSimulatorModal
        isOpen={showPremiumModal}
        setIsOpen={setShowPremiumModal}
      />
    </>
  );
};

export const BannerAd: React.FC<{ section?: string }> = ({ section = 'all' }) => {
  const authContext = useContext(AuthContext);
  const [bannerAds, setBannerAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  if (!authContext) return null;
  const { user } = authContext;

  const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();

  // Load banner ads from Firestore
  useEffect(() => {
    if (user && !isPremium) {
      const { db } = getFirebaseServices();
      const adsRef = collection(db, 'advertisements');
      const q = query(
        adsRef,
        where('placement', '==', 'banner'),
        where('isActive', '==', true),
        orderBy('priority', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ads = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Advertisement[];

        // Filter by section
        const filteredAds = ads.filter(
          (ad) => ad.section === 'all' || ad.section === section
        );
        setBannerAds(filteredAds);
      });

      return () => unsubscribe();
    }
  }, [user, isPremium, section]);

  // Rotate ads every 30 seconds
  useEffect(() => {
    if (bannerAds.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % bannerAds.length);
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [bannerAds]);

  if (!user || isPremium || bannerAds.length === 0) {
    return null;
  }

  const currentAd = bannerAds[currentAdIndex];

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full flex justify-center">
        <AdRenderer key={currentAd.id} ad={currentAd} />
      </div>
    </div>
  );
};

export const useAdManager = () => {
  const authContext = useContext(AuthContext);
  const [showAdPrompt, setShowAdPrompt] = useState(false);

  if (!authContext) return { showAdPrompt: () => { }, isPremium: true };

  const { user } = authContext;
  const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();

  const showAdPromptModal = () => {
    if (!isPremium) {
      setShowAdPrompt(true);
    }
  };

  return { showAdPrompt: showAdPromptModal, isPremium };
};

export default AdManager;
