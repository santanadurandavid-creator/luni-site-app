
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';

interface TermsModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const defaultTermsContent = {
    title: "Términos y Condiciones de Uso",
    lastUpdated: "13 de Noviembre del 2025",
    sections: [
        {
            title: "1. Aceptación de los Términos",
            content: "Al registrarte y utilizar la plataforma Luni Site (en adelante, 'el Servicio'), aceptas cumplir con los siguientes términos y condiciones. Si no estás de acuerdo, no debes usar el Servicio."
        },
        {
            title: "2. Descripción del Servicio",
            content: "Luni Site es una plataforma de e-learning que ofrece simuladores de examen, contenido educativo en video y texto, y quizzes interactivos para ayudar a los estudiantes a prepararse para sus exámenes de admisión a universidades como UNAM, IPN y UAM."
        },
        {
            title: "3. Cuentas de Usuario",
            content: "Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. Debes proporcionar información precisa y completa al registrarte. No puedes compartir tu cuenta con terceros."
        },
        {
            title: "4. Tokens de Examen y Compras",
            content: "Para acceder a los simuladores de examen completos, necesitarás 'tokens'. Estos tokens se pueden adquirir a través de los paquetes de compra disponibles en la plataforma. Los pagos se realizan mediante transferencia bancaria y la activación de los tokens se procesará en un plazo de 24 horas tras la validación del comprobante. No se realizarán reembolsos una vez que los tokens hayan sido asignados a tu cuenta."
        },
        {
            title: "5. Uso Aceptable",
            content: "No debes utilizar el Servicio para ningún propósito ilegal o no autorizado. Queda prohibido el uso de scripts, bots o cualquier otro medio automatizado para interactuar con el Servicio. El contenido proporcionado es para tu uso personal y no comercial; no puedes distribuirlo, modificarlo o venderlo sin nuestro permiso explícito."
        },
        {
            title: "6. Propiedad Intelectual",
            content: "Todo el contenido del Servicio, incluyendo textos, gráficos, logos, videos y software, es propiedad de Luni Site o sus licenciantes y está protegido por las leyes de derechos de autor."
        },
        {
            title: "7. Ranking y Premios",
            content: "Luni Site podrá organizar competencias y otorgar premios a los usuarios con los mejores desempeños en los simuladores de examen. Los criterios de selección (puntuación y tiempo) y los premios serán anunciados en la plataforma. Nos reservamos el derecho de modificar o cancelar estas competencias en cualquier momento."
        },
        {
            title: "8. Limitación de Responsabilidad",
            content: "El Servicio se proporciona 'tal cual'. No garantizamos que el uso del Servicio asegure tu admisión a ninguna institución educativa. No seremos responsables por ningún daño directo o indirecto que resulte del uso de la plataforma."
        },
        {
            title: "9. Modificaciones a los Términos",
            content: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos de los cambios importantes, y tu uso continuado del Servicio constituirá tu aceptación de los nuevos términos."
        },
    ]
}

export function TermsModal({ isOpen, setIsOpen }: TermsModalProps) {
  const [termsContent, setTermsContent] = useState(defaultTermsContent);

  useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        if (data.termsContent) {
          setTermsContent(data.termsContent);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-4xl p-0 flex flex-col rounded-lg border-0">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle className="font-headline">{termsContent.title}</DialogTitle>
          <DialogDescription>
            Última actualización: {termsContent.lastUpdated}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full px-6">
                <div className="py-4 space-y-6">
                    {termsContent.sections.map((section, index) => (
                        <div key={index}>
                            <h3 className="font-bold font-headline mb-2">{section.title}</h3>
                            <p className="text-sm text-muted-foreground">{section.content}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
