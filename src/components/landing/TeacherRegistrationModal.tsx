'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Users, GraduationCap, Clock, Award, BookOpen } from 'lucide-react';

interface TeacherRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TeacherRegistrationModal({ isOpen, onClose }: TeacherRegistrationModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        specialty: '',
        experience: '',
        certifications: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Construct WhatsApp message
        const message = `👋 Hola, estoy interesado en dar clases en Luni.
    
📋 *Mis datos:*
👤 *Nombre:* ${formData.name}
📱 *Teléfono:* ${formData.phone}
📧 *Correo:* ${formData.email}
    
📚 *Perfil Profesional:*
🎓 *Especialidad:* ${formData.specialty}
🕰️ *Experiencia:* ${formData.experience}
🏅 *Certificaciones/Egresado de:* ${formData.certifications}
    
Quedo atento para enviar mi video de prueba.`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/525538442731?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-[#3A5064]">
                        <Users className="w-6 h-6" />
                        Únete como Profesor
                    </DialogTitle>
                    <DialogDescription>
                        Comparte tu conocimiento y ayuda a miles de estudiantes a ingresar a la UNAM. Completa tus datos básicos para iniciar el proceso.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Tu nombre completo"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
                            <Input
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="55 1234 5678"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="correo@ejemplo.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="specialty">Materia de Especialidad</Label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="specialty"
                                name="specialty"
                                value={formData.specialty}
                                onChange={handleChange}
                                className="pl-9"
                                placeholder="Ej: Matemáticas, Historia, Física..."
                                required
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="experience">Años de Experiencia</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="experience"
                                    name="experience"
                                    value={formData.experience}
                                    onChange={handleChange}
                                    className="pl-9"
                                    placeholder="Ej: 5 años"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="certifications">Alma Mater / Certificaciones</Label>
                            <div className="relative">
                                <Award className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="certifications"
                                    name="certifications"
                                    value={formData.certifications}
                                    onChange={handleChange}
                                    className="pl-9"
                                    placeholder="Ej: UNAM, IPN, TOEFL..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                        <div className="font-semibold flex items-center gap-2 mb-1">
                            <GraduationCap className="w-4 h-4" />
                            Siguiente Paso: Video de Prueba
                        </div>
                        <p>
                            Al enviar este formulario, se abrirá WhatsApp. Por ese medio te asignaremos un tema para que grabes una <strong>clase muestra de 30 minutos</strong> y nos la envíes para evaluar tu metodología.
                        </p>
                    </div>

                    <Button type="submit" className="w-full bg-[#3A5064] hover:bg-[#2d3e50] text-lg py-6">
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Datos y Abrir WhatsApp
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
