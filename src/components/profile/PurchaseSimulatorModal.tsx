
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
import { Input } from '@/components/ui/input';
import React from 'react';
import { Banknote, MessageCircle, Copy, ArrowLeft, Star, Video, FileText, ClipboardCheck, ShieldCheck, Ticket, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';

interface PurchaseSimulatorModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  recommendedPackageName?: string | null;
  isFromPremiumButton?: boolean;
}

const bankInfo = {
  accountNumber: '1234 5678 9012 3456',
  accountHolder: 'Luni Site',
  whatsappNumber: '525619764631',
};

const premiumPackages = [
    { name: 'Plan Básico', days: 30, price: 149, description: '30 días de acceso premium y 1 examen simulador.', highlighted: false, exams: 1 },
    { name: 'Plan Estándar', days: 30, price: 229, description: '30 días de acceso premium y 3 exámenes simuladores.', highlighted: true, exams: 3 },
    { name: 'Plan Extendido', days: 60, price: 349, description: '60 días de acceso premium y 6 exámenes simuladores.', highlighted: false, exams: 6 },
];

type Package = (typeof premiumPackages)[0];

export function PurchaseSimulatorModal({ isOpen, setIsOpen, recommendedPackageName, isFromPremiumButton = false }: PurchaseSimulatorModalProps) {
  const { toast } = useToast();

  const [step, setStep] = React.useState(1);
  const [selectedPackage, setSelectedPackage] = React.useState<Package | null>(null);
  const [referralId, setReferralId] = React.useState('');

  React.useEffect(() => {
    if (isOpen && recommendedPackageName) {
      const recommendedPkg = premiumPackages.find(p => p.name === recommendedPackageName.split(' (')[0]);
      if (recommendedPkg) {
        setSelectedPackage(recommendedPkg);
        setStep(2);
      }
    } else if (!isOpen) {
      // Reset when modal is closed
      setTimeout(() => setStep(1), 300);
    }
  }, [isOpen, recommendedPackageName]);

  const modalTitle = '¡Hazte Premium!';
  const modalDescription = 'Desbloquea todo el contenido y practica sin límites para asegurar tu lugar en la universidad.';
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: 'El número de cuenta ha sido copiado al portapapeles.' });
  };
  
  const handleOpenWhatsApp = () => {
     if (!selectedPackage) return;
     const message = `Hola, quiero reportar mi pago para Luni Site. Adjunto mi comprobante para el plan: ${selectedPackage.name}.`;
     const url = `https://wa.me/${bankInfo.whatsappNumber}?text=${encodeURIComponent(message)}`;
     window.open(url, '_blank');
  }

  const handleViewPromotion = () => {
    if (!referralId.trim()) {
      toast({ title: 'Error', description: 'Por favor ingresa un ID de referido.' });
      return;
    }
    const message = `Me ha referido el ID ${referralId}. Quiero saber promociones de referidos.`;
    const url = `https://wa.me/525538442731?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setStep(2);
  }
  
  const handleBack = () => {
    setStep(1);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setSelectedPackage(null);
      }, 300);
    }
    setIsOpen(open);
  }

  const renderPackageCard = (pkg: Package) => {
    return (
      <Card 
        key={pkg.name} 
        className={cn("w-full cursor-pointer hover:border-primary", pkg.highlighted && 'border-2 border-primary')}
        onClick={() => handleSelectPackage(pkg)}
      >
        <CardContent className="p-4">
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">${pkg.price} MXN</p>
                     <div className="text-xs font-bold text-primary flex items-center justify-end gap-1 mt-1">
                        <Star className="h-3 w-3"/>
                        <span>{pkg.days} Días de Acceso</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {pkg.exams} Examen{pkg.exams > 1 ? 'es' : ''} Simulador{pkg.exams > 1 ? 'es' : ''}
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-md rounded-lg p-0 max-h-[90vh] grid grid-rows-[auto_1fr_auto]">
       
        {step === 2 && selectedPackage ? (
            <>
                 <DialogHeader className="relative text-center p-4 border-b">
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogTitle>Realiza tu Pago</DialogTitle>
                </DialogHeader>
                
                 <div className="overflow-y-auto">
                    <div className="p-6 space-y-6">
                      <p className="text-sm text-center text-muted-foreground">Transfiere el monto de <strong>${selectedPackage.price} MXN</strong> a la siguiente cuenta.</p>
                      <div className="p-4 border rounded-lg bg-muted/50">
                          <h3 className="font-semibold flex items-center gap-2"><Banknote className="h-5 w-5 text-primary"/>Datos de Transferencia</h3>
                          <div className="mt-3 space-y-2 text-sm">
                              <p><strong>Paquete seleccionado:</strong> {selectedPackage.name}</p>
                              <p><strong>Titular:</strong> {bankInfo.accountHolder}</p>
                              <div className="flex items-center justify-between">
                                  <p><strong>Número de Cuenta:</strong> {bankInfo.accountNumber}</p>
                                  <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(bankInfo.accountNumber)}>
                                      <Copy className="h-4 w-4" />
                                  </Button>
                              </div>
                               <div className="!mt-4 p-3 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-lg flex items-start gap-3 text-xs">
                                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                    <span>
                                        <strong>Importante:</strong> En el concepto de la transferencia, por favor escribe el <strong>correo electrónico</strong> con el que te registraste.
                                    </span>
                                </div>
                          </div>
                      </div>

                      <div className="text-center space-y-2">
                          <p className="font-semibold">¿Ya realizaste el pago?</p>
                          <p className="text-muted-foreground text-sm">
                              Para activar tu plan, es indispensable que envíes tu comprobante a nuestro WhatsApp.
                          </p>
                          <Button className="mt-2" onClick={handleOpenWhatsApp}>
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Enviar Comprobante
                          </Button>
                      </div>
                    </div>
                 </div>
                 <DialogFooter className="p-4 border-t">
                    <p className="text-xs text-muted-foreground text-center w-full">
                        La activación puede tardar hasta 24 horas tras la validación del pago.
                    </p>
                </DialogFooter>
            </>
        ) : (
            <>
                <DialogHeader className="p-4 border-b">
                    <div className="h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-4 border-4 bg-amber-100 dark:bg-amber-900/50 border-amber-200 dark:border-amber-800">
                        <Star className="h-8 w-8 text-amber-500" />
                    </div>
                    <DialogTitle className="text-center font-headline">{modalTitle}</DialogTitle>
                    <DialogDescription className="text-center">
                       {modalDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4 border-b">
                  <h3 className="font-semibold mb-2 text-center">Promoción de Referido</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ingresa el ID de referido"
                      value={referralId}
                      onChange={(e) => setReferralId(e.target.value)}
                    />
                    <Button onClick={handleViewPromotion}>Ver Promoción</Button>
                  </div>
                </div>
                 <ScrollArea className="overflow-y-auto">
                    <div className="px-6 py-4 grid grid-cols-1 gap-4">
                        {premiumPackages.map(pkg => renderPackageCard(pkg))}
                    </div>
                 </ScrollArea>
                 <DialogFooter className="p-4 border-t">
                    <p className="text-xs text-muted-foreground text-center w-full">
                        La activación puede tardar hasta 24 horas tras la validación del pago.
                    </p>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
