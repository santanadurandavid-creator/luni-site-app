'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Facebook, Instagram, MessageCircle } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ReferralModal({ isOpen, setIsOpen }: ReferralModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const referralId = user?.userId || '';
  const shareMessage = `Únete a Luni con mi código de referido: ${referralId} ${window.location.origin}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralId);
    toast({ title: 'Copiado', description: 'Tu ID de referido ha sido copiado al portapapeles.' });
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  const handleShareFacebook = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Únete a Luni',
        text: shareMessage,
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast({ title: 'Copiado', description: 'Mensaje copiado. Comparte manualmente en Facebook.' });
    }
  };

  const handleShareInstagram = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Únete a Luni',
        text: shareMessage,
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast({ title: 'Copiado', description: 'Mensaje copiado. Comparte manualmente en Instagram.' });
    }
  };

  const handleGeneralShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Únete a Luni',
        text: shareMessage,
        url: window.location.origin,
      });
    } else {
      navigator.clipboard.writeText(shareMessage);
      toast({ title: 'Copiado', description: 'Mensaje copiado. Comparte manualmente.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-md rounded-lg p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="font-headline">Refiere Amigos</DialogTitle>
          <DialogDescription>
            Refiere amigos y si el amigo contrata algún plan, se te regalará un examen simulador. Un token.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Tu ID de referido:</p>
            <p className="text-lg font-bold text-primary">{referralId}</p>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleCopy} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copiar ID
            </Button>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Compartir en:</p>
            <div className="flex justify-center space-x-2">
              <Button variant="ghost" size="icon" onClick={handleShareWhatsApp}>
                <MessageCircle className="h-5 w-5 text-green-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShareFacebook}>
                <Facebook className="h-5 w-5 text-blue-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShareInstagram}>
                <Instagram className="h-5 w-5 text-pink-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleGeneralShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
