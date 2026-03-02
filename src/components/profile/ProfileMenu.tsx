
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { User, LogOut, Shield, Moon, Sun, Monitor, Edit, Pencil, Download, Star, LifeBuoy, Repeat, GraduationCap, MessageCircle, Globe, Share2, RefreshCw, Users } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useMemo } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { DynamicEditProfileModal, DynamicExamSelectionModal, DynamicIosInstallPrompt, DynamicRatingModal, DynamicHelpModal } from '../shared/dynamic';
import { TermsAndPrivacyModal } from '../auth/TermsAndPrivacyModal';
import { TermsModal } from '../auth/TermsModal';
import { SocialMediaModal } from '../auth/SocialMediaModal';
import { ReferralModal } from '@/components/profile/ReferralModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export function ProfileMenu() {
  const { user, logout, updateUser } = useAuth();
  const { setTheme } = useTheme();
  const { t } = useLanguage();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isTermsOnlyModalOpen, setIsTermsOnlyModalOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const { canInstall, promptInstall, showIosInstallPrompt, setShowIosInstallPrompt } = usePWAInstall();
  const [isSocialMediaModalOpen, setIsSocialMediaModalOpen] = useState(false);
  const { toast } = useToast();

  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const handleGenerateId = async () => {
    if (!user || user.referralId) return;
    setIsGeneratingId(true);
    try {
      // Simple random 8-digit ID
      const generatedId = Math.floor(10000000 + Math.random() * 90000000).toString();
      await updateUser({ referralId: generatedId });
      toast({ title: 'ID de Referido Generado', description: `Tu nuevo ID es: ${generatedId}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el ID de referido.' });
    } finally {
      setIsGeneratingId(false);
    }
  };

  const canRate = useMemo(() => {
    if (!user?.ratings || user.ratings.length === 0) return true;
    const lastRating = user.ratings[user.ratings.length - 1];
    const lastRatingDate = lastRating.date.seconds ? new Date(lastRating.date.seconds * 1000) : new Date(lastRating.date);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return lastRatingDate < oneMonthAgo;
  }, [user?.ratings]);

  const premiumUntilDate = user?.premiumUntil ? (user.premiumUntil.toDate ? user.premiumUntil.toDate() : new Date(user.premiumUntil)) : null;
  const isPremiumActive = user?.premiumPlan && premiumUntilDate && premiumUntilDate > new Date();

  if (!user) return null;

  const handleLogout = () => {
    logout();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mi ID de Luni',
        text: `Mi ID de Luni es: ${user.referralId}`,
        url: window.location.href,
      })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(user.referralId || '');
      toast({ title: 'Copiado', description: 'Tu ID de referido ha sido copiado al portapapeles.' });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none font-headline">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              <div className="flex items-center pt-1">
                {user?.referralId ? (
                  <>
                    <p className="text-xs leading-none text-muted-foreground">
                      ID: {user.referralId}
                    </p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={handleShare}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary" onClick={handleGenerateId} disabled={isGeneratingId}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${isGeneratingId ? 'animate-spin' : ''}`} />
                    Generar ID
                  </Button>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsProfileModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>{t('editProfile') || 'Editar Perfil'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsExamModalOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>{t('changeArea') || 'Cambiar Área'}</span>
          </DropdownMenuItem>
           <DropdownMenuItem onSelect={() => setIsRatingModalOpen(true)} disabled={!canRate}>
              <Star className="mr-2 h-4 w-4" />
              <span>{t('rateLuni') || 'Calificar a Luni'}</span>
          </DropdownMenuItem>
          {isPremiumActive && (
            <DropdownMenuItem onSelect={() => setIsReferralModalOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              <span>Referir</span>
            </DropdownMenuItem>
          )}
           <DropdownMenuItem onSelect={() => setIsHelpModalOpen(true)}>
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>{t('helpSupport') || 'Ayuda y Soporte'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsTermsModalOpen(true)}>
              <Shield className="mr-2 h-4 w-4" />
              <span>{t('termsConditions') || 'Términos y Condiciones'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsSocialMediaModalOpen(true)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>{t('contact') || 'Contacto'}</span>
          </DropdownMenuItem>

          {canInstall && (
            <DropdownMenuItem onSelect={promptInstall}>
              <Download className="mr-2 h-4 w-4" />
              <span>{t('installApp') || 'Instalar App'}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 mr-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>{t('theme') || 'Tema'}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>{t('light') || 'Claro'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>{t('dark') || 'Oscuro'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>{t('system') || 'Sistema'}</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{t('logout') || 'Cerrar sesión'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <DynamicEditProfileModal isOpen={isProfileModalOpen} setIsOpen={setIsProfileModalOpen} />
      <DynamicExamSelectionModal 
        isOpen={isExamModalOpen}
        setIsOpen={setIsExamModalOpen}
        isUpdate={true}
      />
      <DynamicIosInstallPrompt isOpen={showIosInstallPrompt} setIsOpen={setShowIosInstallPrompt} />
      <DynamicRatingModal isOpen={isRatingModalOpen} setIsOpen={setIsRatingModalOpen} />
      <DynamicHelpModal isOpen={isHelpModalOpen} setIsOpen={setIsHelpModalOpen} />
      <TermsAndPrivacyModal isOpen={isTermsModalOpen} setIsOpen={setIsTermsModalOpen} />
      <TermsModal isOpen={isTermsOnlyModalOpen} setIsOpen={setIsTermsOnlyModalOpen} />
      <SocialMediaModal isOpen={isSocialMediaModalOpen} setIsOpen={setIsSocialMediaModalOpen} />
      <ReferralModal isOpen={isReferralModalOpen} setIsOpen={setIsReferralModalOpen} />
    </>
  );
}
