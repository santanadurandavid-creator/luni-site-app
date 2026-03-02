'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeTab?: 'terms' | 'privacy';
  settings?: any;
  setSettings?: (settings: any) => void;
}

const termsContent = {
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

const privacyContent = {
    title: "Política de Privacidad",
    lastUpdated: "13 de Noviembre del 2025",
    sections: [
        {
            title: "1. Información que Recopilamos",
            content: "Recopilamos información personal que nos proporcionas directamente, como nombre, correo electrónico, y datos de uso de la plataforma. También recopilamos datos técnicos como dirección IP, tipo de dispositivo y comportamiento de navegación."
        },
        {
            title: "2. Uso de la Información",
            content: "Utilizamos tu información para proporcionar y mejorar nuestros servicios, procesar pagos, enviar comunicaciones importantes y personalizar tu experiencia en la plataforma."
        },
        {
            title: "3. Compartir Información",
            content: "No vendemos ni alquilamos tu información personal a terceros. Podemos compartir información con proveedores de servicios de confianza que nos ayudan a operar la plataforma, siempre bajo acuerdos de confidencialidad."
        },
        {
            title: "4. Seguridad de Datos",
            content: "Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal contra acceso no autorizado, alteración, divulgación o destrucción."
        },
        {
            title: "5. Cookies y Tecnologías Similares",
            content: "Utilizamos cookies y tecnologías similares para mejorar tu experiencia, recordar tus preferencias y analizar el uso de la plataforma."
        },
        {
            title: "6. Derechos del Usuario",
            content: "Tienes derecho a acceder, corregir, eliminar o limitar el procesamiento de tu información personal. Puedes ejercer estos derechos contactándonos a través de nuestro soporte."
        },
        {
            title: "7. Retención de Datos",
            content: "Retenemos tu información personal solo durante el tiempo necesario para cumplir con los propósitos descritos en esta política, a menos que la ley requiera o permita un período más largo."
        },
        {
            title: "8. Cambios a la Política",
            content: "Podemos actualizar esta política de privacidad periódicamente. Te notificaremos de cambios significativos a través de la plataforma o por correo electrónico."
        },
    ]
}

export function TermsAndPrivacyModal({ isOpen, setIsOpen, activeTab = 'terms', settings, setSettings }: TermsAndPrivacyModalProps) {
  const [localTerms, setLocalTerms] = useState(termsContent);
  const [localPrivacy, setLocalPrivacy] = useState(privacyContent);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState<'terms' | 'privacy'>(activeTab);
  const [loadedSettings, setLoadedSettings] = useState<any>(null);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!setSettings) {
        // If no setSettings prop, load from Firebase
        try {
          const { db } = getFirebaseServices();
          const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
          if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            setLoadedSettings(data);
            if (data.termsContent) {
              setLocalTerms(data.termsContent);
            }
            if (data.privacyContent) {
              setLocalPrivacy(data.privacyContent);
            }
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      } else {
        // Load from settings prop or fallback to default content
        if (settings?.termsContent) {
          setLocalTerms(settings.termsContent);
        } else {
          setLocalTerms(termsContent);
        }
        if (settings?.privacyContent) {
          setLocalPrivacy(settings.privacyContent);
        } else {
          setLocalPrivacy(privacyContent);
        }
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, settings, setSettings]);

  const handleSectionChange = (tab: 'terms' | 'privacy', index: number, field: 'title' | 'content', value: string) => {
    if (tab === 'terms') {
      const updatedSections = [...localTerms.sections];
      updatedSections[index] = { ...updatedSections[index], [field]: value };
      setLocalTerms({ ...localTerms, sections: updatedSections });
    } else {
      const updatedSections = [...localPrivacy.sections];
      updatedSections[index] = { ...updatedSections[index], [field]: value };
      setLocalPrivacy({ ...localPrivacy, sections: updatedSections });
    }
  };

  const handleAddSection = (tab: 'terms' | 'privacy') => {
    const newSection = {
      title: `${(tab === 'terms' ? localTerms.sections.length : localPrivacy.sections.length) + 1}. Nuevo Punto`,
      content: "Contenido del nuevo punto..."
    };
    if (tab === 'terms') {
      setLocalTerms({
        ...localTerms,
        sections: [...localTerms.sections, newSection]
      });
    } else {
      setLocalPrivacy({
        ...localPrivacy,
        sections: [...localPrivacy.sections, newSection]
      });
    }
  };

  const handleRemoveSection = (tab: 'terms' | 'privacy', index: number) => {
    if (tab === 'terms') {
      const updatedSections = localTerms.sections.filter((_, i) => i !== index);
      setLocalTerms({ ...localTerms, sections: updatedSections });
    } else {
      const updatedSections = localPrivacy.sections.filter((_, i) => i !== index);
      setLocalPrivacy({ ...localPrivacy, sections: updatedSections });
    }
  };

  const handleSave = async () => {
    if (!setSettings) return;
    setSaving(true);
    try {
      const { db } = getFirebaseServices();
      await setDoc(doc(db, 'settings', 'general'), {
        termsContent: localTerms,
        privacyContent: localPrivacy,
      }, { merge: true });
      // Update parent settings state
      setSettings({
        ...settings,
        termsContent: localTerms,
        privacyContent: localPrivacy,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving terms and privacy:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[90vw] h-[90vh] sm:w-[80vw] sm:h-[80vh] md:w-[60vw] md:h-[60vh] max-w-none p-0 flex flex-col rounded-2xl border shadow-2xl bg-white overflow-hidden">
        <DialogHeader className="p-6 sm:p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="font-headline text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                Términos y Condiciones / Política de Privacidad
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Última actualización: {currentTab === 'terms' ? localTerms.lastUpdated : localPrivacy.lastUpdated}
              </DialogDescription>
            </div>
            {setSettings && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving} className="border-gray-300 hover:bg-gray-50">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-hidden px-6 sm:px-4">
          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'terms' | 'privacy')} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mt-6 bg-gray-100 rounded-lg p-1 gap-2">
              <TabsTrigger value="terms" className="px-4 py-2 font-semibold text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md font-medium text-sm sm:text-base text-center">Términos</TabsTrigger>
              <TabsTrigger value="privacy" className="px-4 py-2 font-semibold text-gray-600 data-[state=active]:text-gray-900 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-md font-medium text-sm sm:text-base text-center">Privacidad</TabsTrigger>
            </TabsList>
            <div className="flex-grow overflow-hidden">
              <TabsContent value="terms" className="h-full m-0">
                <ScrollArea className="h-full pr-4">
                  <div className="py-6 space-y-8">
                    {setSettings && (
                      <div className="flex justify-end mb-6">
                        <Button onClick={() => handleAddSection('terms')} size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Punto
                        </Button>
                      </div>
                    )}
                    {localTerms.sections.map((section, index) => (
                      <div key={index} className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            {setSettings ? (
                              <Textarea
                                className="mb-3 font-bold font-headline text-lg resize-none border-none p-0 focus:ring-0"
                                value={section.title}
                                onChange={(e) => handleSectionChange('terms', index, 'title', e.target.value)}
                                rows={1}
                              />
                            ) : (
                              <h3 className="mb-3 font-bold font-headline text-lg text-gray-900">
                                {section.title}
                              </h3>
                            )}
                            {setSettings ? (
                              <Textarea
                                className="text-sm text-gray-700 resize-none leading-relaxed border-none p-0 focus:ring-0"
                                value={section.content}
                                onChange={(e) => handleSectionChange('terms', index, 'content', e.target.value)}
                                rows={6}
                              />
                            ) : (
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {section.content}
                              </p>
                            )}
                          </div>
                          {setSettings && localTerms.sections.length > 1 && (
                            <Button
                              onClick={() => handleRemoveSection('terms', index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="privacy" className="h-full m-0">
                <ScrollArea className="h-full pr-4">
                  <div className="py-6 space-y-8">
                    {setSettings && (
                      <div className="flex justify-end mb-6">
                        <Button onClick={() => handleAddSection('privacy')} size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Punto
                        </Button>
                      </div>
                    )}
                    {localPrivacy.sections.map((section, index) => (
                      <div key={index} className="relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            {setSettings ? (
                              <Textarea
                                className="mb-3 font-bold font-headline text-lg resize-none border-none p-0 focus:ring-0"
                                value={section.title}
                                onChange={(e) => handleSectionChange('privacy', index, 'title', e.target.value)}
                                rows={1}
                              />
                            ) : (
                              <h3 className="mb-3 font-bold font-headline text-lg text-gray-900">
                                {section.title}
                              </h3>
                            )}
                            {setSettings ? (
                              <Textarea
                                className="text-sm text-gray-700 resize-none leading-relaxed border-none p-0 focus:ring-0"
                                value={section.content}
                                onChange={(e) => handleSectionChange('privacy', index, 'content', e.target.value)}
                                rows={6}
                              />
                            ) : (
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {section.content}
                              </p>
                            )}
                          </div>
                          {setSettings && localPrivacy.sections.length > 1 && (
                            <Button
                              onClick={() => handleRemoveSection('privacy', index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
          {setSettings && (
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
