import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import AdComponent from '../shared/AdComponent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PurchaseSimulatorModal } from '@/components/profile/PurchaseSimulatorModal';
import { useRouter } from 'next/navigation';
import { AdPromptModal } from './AdPromptModal';

const adScripts = [
  {
    type: 'popup',
    script: `
      <script type="text/javascript">
        atOptions = {
          'key' : 'd6a378bbac67313889ea68360bf7c0ed',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };
      </script>
      <script type="text/javascript" src="//www.highperformanceformat.com/d6a378bbac67313889ea68360bf7c0ed/invoke.js"></script>
    `,
  },
  {
    type: 'banner',
    script: `
      <script type="text/javascript">
        atOptions = {
          'key' : '7fd0b5e98b27de1983a2358824d0b09e',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };
      </script>
      <script type="text/javascript" src="//www.highperformanceformat.com/7fd0b5e98b27de1983a2358824d0b09e/invoke.js"></script>
    `,
  },
  {
    type: 'vertical',
    script: `
      <script type="text/javascript">
        atOptions = {
          'key' : '0f897792b9202f661fb53626fec81f9a',
          'format' : 'iframe',
          'height' : 300,
          'width' : 160,
          'params' : {}
        };
      </script>
      <script type="text/javascript" src="//www.highperformanceformat.com/0f897792b9202f661fb53626fec81f9a/invoke.js"></script>
    `,
  },
];

const directLinkAds = [
  'https://www.effectivegatecpm.com/jxer3ihzu?key=e56254b400b9a17e2e99b278c8a19001',
  'https://www.effectivegatecpm.com/eakezs74nb?key=b70b0a4033fe58cbd7273b34c6ac3634',
  'https://www.effectivegatecpm.com/i7jwghmp?key=0a80e35b977bd15a700aade70f039871',
];

const AdManager: React.FC = () => {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const [showPopupAd, setShowPopupAd] = useState(false);
  const [popupAdScript, setPopupAdScript] = useState('');
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAdPrompt, setShowAdPrompt] = useState(false);
  const [showDirectAd, setShowDirectAd] = useState(false);
  const [directAdUrl, setDirectAdUrl] = useState('');
  const [adCountdown, setAdCountdown] = useState(10);
  const [canCloseAd, setCanCloseAd] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cycleIndexRef = useRef(0);

  if (!authContext) return null;
  const { user } = authContext;

  const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();

  useEffect(() => {
    if (user && !isPremium) {
      const cycleIntervals = [200000]; // 200s

      const showAd = () => {
        const popupAds = adScripts.filter((ad) => ad.type === 'popup');
        const randomAd = popupAds[Math.floor(Math.random() * popupAds.length)];
        setPopupAdScript(randomAd.script);
        setShowPopupAd(true);
        setCanClose(false);
        setCountdown(10);

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
      };

      // First ad after 200 seconds
      intervalRef.current = setTimeout(() => {
        showAd();
        // Then cycle every 200s
        const cycleAd = () => {
          const interval = cycleIntervals[cycleIndexRef.current % cycleIntervals.length];
          intervalRef.current = setTimeout(() => {
            showAd();
            cycleIndexRef.current++;
            cycleAd();
          }, interval);
        };
        cycleAd();
      }, 200000);

      return () => {
        if (intervalRef.current) clearTimeout(intervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      };
    }
  }, [user, isPremium]);

  const handleWatchAd = () => {
    setShowAdPrompt(false);
    const randomAd = directLinkAds[Math.floor(Math.random() * directLinkAds.length)];
    setDirectAdUrl(randomAd);
    setShowDirectAd(true);
    setCanCloseAd(false);
    setAdCountdown(10);

    countdownIntervalRef.current = setInterval(() => {
      setAdCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setCanCloseAd(true);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);
  };

  const closeDirectAd = () => {
    setShowDirectAd(false);
    setDirectAdUrl('');
    setCanCloseAd(false);
    setAdCountdown(10);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
  };

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
            <AdComponent adScript={popupAdScript} />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Puedes cerrar este anuncio en {countdown} segundos.
          </p>
          <Button
            onClick={() => setShowPremiumModal(true)}
            className="mt-4"
          >
            Obtener Premium para no ver anuncios
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={showDirectAd} onOpenChange={(open) => { if (canCloseAd) closeDirectAd(); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col items-center justify-center p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Anuncio</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center w-full h-full">
            <iframe
              src={directAdUrl}
              className="w-full h-[60vh] border-0"
              title="Ad Content"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Puedes cerrar este anuncio en {adCountdown} segundos.
          </p>
          {canCloseAd && (
            <Button onClick={closeDirectAd} className="mt-4">
              Cerrar y Ver Contenido
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <AdPromptModal
        isOpen={showAdPrompt}
        onClose={() => setShowAdPrompt(false)}
        onWatchAd={handleWatchAd}
      />
      <PurchaseSimulatorModal
        isOpen={showPremiumModal}
        setIsOpen={setShowPremiumModal}
      />
    </>
  );
};

export const BannerAd: React.FC = () => {
  const authContext = useContext(AuthContext);
  const [adScript, setAdScript] = useState('');

  if (!authContext) return null;
  const { user } = authContext;

  const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();

  useEffect(() => {
    if (user && !isPremium) {
      const bannerAds = adScripts.filter((ad) => ad.type === 'banner');
      const randomAd = bannerAds[Math.floor(Math.random() * bannerAds.length)];
      setAdScript(randomAd.script);
    }
  }, [user, isPremium]);

  if (!user || isPremium) {
    return null;
  }

  return <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center"><AdComponent adScript={adScript} /></div>;
};

export const useAdManager = () => {
  const authContext = useContext(AuthContext);
  const [showAdPrompt, setShowAdPrompt] = useState(false);

  if (!authContext) return { showAdPrompt: () => {}, isPremium: true };

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
