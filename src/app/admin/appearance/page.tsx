
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Loader2, Palette } from 'lucide-react';
import type { Setting } from '@/lib/types';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export default function AdminAppearancePage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Setting>({} as Setting);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [colorInput, setColorInput] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageOpacity, setImageOpacity] = useState(50); // Default opacity 50%
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [facebookUrl, setFacebookUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');
    const [whatsappUrl, setWhatsappUrl] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [welcomeModalImageFile, setWelcomeModalImageFile] = useState<File | null>(null);
    const [welcomeModalImagePreview, setWelcomeModalImagePreview] = useState<string | null>(null);
    const [welcomeModalText, setWelcomeModalText] = useState('');
    const [loginScreenImageFile, setLoginScreenImageFile] = useState<File | null>(null);
    const [loginScreenImagePreview, setLoginScreenImagePreview] = useState<string | null>(null);
    const [tutorialVideoUrl, setTutorialVideoUrl] = useState('');




    useEffect(() => {
        const { db } = getFirebaseServices();
        const settingsRef = doc(db, 'settings', 'theme');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Setting;
                setSettings(data);
                setColorInput(data.profileHeaderBackground?.startsWith('#') ? data.profileHeaderBackground : '');
                if (data.profileHeaderBackground?.startsWith('http')) {
                    setImagePreview(data.profileHeaderBackground);
                }
                if (typeof data.profileHeaderImageOpacity === 'number') {
                    setImageOpacity(data.profileHeaderImageOpacity * 100);
                }
                if (data.logoUrl) {
                    setLogoPreview(data.logoUrl);
                }

                if (data.facebookUrl) {
                    setFacebookUrl(data.facebookUrl);
                }
                if (data.instagramUrl) {
                    setInstagramUrl(data.instagramUrl);
                }
                if (data.tiktokUrl) {
                    setTiktokUrl(data.tiktokUrl);
                }
                if (data.whatsappUrl) {
                    setWhatsappUrl(data.whatsappUrl);
                }
                if (data.contactEmail) {
                    setContactEmail(data.contactEmail);
                }
                if (data.welcomeModalImageUrl) {
                    setWelcomeModalImagePreview(data.welcomeModalImageUrl);
                }
                if (data.welcomeModalText) {
                    setWelcomeModalText(data.welcomeModalText);
                }
                if (data.loginScreenImageUrl) {
                    setLoginScreenImagePreview(data.loginScreenImageUrl);
                }
                if (data.tutorialVideoUrl) {
                    setTutorialVideoUrl(data.tutorialVideoUrl);
                }


            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setColorInput(''); // Clear color input if image is selected
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleWelcomeModalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setWelcomeModalImageFile(file);
            setWelcomeModalImagePreview(URL.createObjectURL(file));
        }
    };

    const handleLoginScreenImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLoginScreenImageFile(file);
            setLoginScreenImagePreview(URL.createObjectURL(file));
        }
    };







    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setColorInput(e.target.value);
        setImageFile(null); // Clear image if color is being set
        setImagePreview(null);
    };




    const handleSave = async () => {
        setIsSaving(true);
        let backgroundValue = settings.profileHeaderBackground || '';
        let logoValue = settings.logoUrl || '';
        let welcomeModalImageValue = settings.welcomeModalImageUrl || '';
        let loginScreenImageValue = settings.loginScreenImageUrl || '';

        try {
            const { db, storage } = getFirebaseServices();

            if (imageFile) {
                // Upload background image to Firebase Storage and get URL
                const storageRef = ref(storage, `settings/profileHeaderBackground_${Date.now()}`);
                await uploadBytes(storageRef, imageFile);
                backgroundValue = await getDownloadURL(storageRef);
            } else if (colorInput) {
                backgroundValue = colorInput;
            } else {
                backgroundValue = imagePreview || '';
            }

            if (logoFile) {
                // Upload logo to Firebase Storage and get URL
                const storageRef = ref(storage, `settings/logo_${Date.now()}`);
                await uploadBytes(storageRef, logoFile);
                logoValue = await getDownloadURL(storageRef);
            }

            if (welcomeModalImageFile) {
                // Upload welcome modal image to Firebase Storage and get URL
                const storageRef = ref(storage, `settings/welcomeModalImage_${Date.now()}`);
                await uploadBytes(storageRef, welcomeModalImageFile);
                welcomeModalImageValue = await getDownloadURL(storageRef);
            }

            if (loginScreenImageFile) {
                // Upload login screen image to Firebase Storage and get URL
                const storageRef = ref(storage, `settings/loginScreenImage_${Date.now()}`);
                await uploadBytes(storageRef, loginScreenImageFile);
                loginScreenImageValue = await getDownloadURL(storageRef);
            }

            const newSettings: Setting = {
                ...settings,
                profileHeaderBackground: backgroundValue,
                profileHeaderImageOpacity: imageOpacity / 100,
                logoUrl: logoValue,
                facebookUrl: facebookUrl,
                instagramUrl: instagramUrl,
                tiktokUrl: tiktokUrl,
                whatsappUrl: whatsappUrl,
                contactEmail: contactEmail,
                welcomeModalImageUrl: welcomeModalImageValue,
                welcomeModalText: welcomeModalText,
                loginScreenImageUrl: loginScreenImageValue,
                tutorialVideoUrl: tutorialVideoUrl,
            };

            await setDoc(doc(db, 'settings', 'theme'), newSettings, { merge: true });

            setSettings(newSettings);

            // Update previews
            if (backgroundValue && backgroundValue.startsWith('http')) {
                setImagePreview(backgroundValue);
            }
            if (logoValue && logoValue.startsWith('http')) {
                setLogoPreview(logoValue);
            }
            if (welcomeModalImageValue && welcomeModalImageValue.startsWith('http')) {
                setWelcomeModalImagePreview(welcomeModalImageValue);
            }
            if (loginScreenImageValue && loginScreenImageValue.startsWith('http')) {
                setLoginScreenImagePreview(loginScreenImageValue);
            }

            toast({
                title: "Configuración Guardada",
                description: "Los cambios de apariencia han sido guardados.",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar la configuración." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetToDefault = async () => {
        setIsSaving(true);
        const defaultSettings: Partial<Setting> = {};

        try {
            const { db } = getFirebaseServices();
            await setDoc(doc(db, 'settings', 'theme'), defaultSettings, { merge: true });

            setSettings(prev => ({ ...prev, ...defaultSettings }));


            toast({
                title: "Configuración Restablecida",
                description: "Se han restablecido las configuraciones predeterminadas.",
            });
        } catch (error) {
            console.error("Error resetting settings:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo restablecer la configuración." });
        } finally {
            setIsSaving(false);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Apariencia</h1>
                <p className="text-muted-foreground">Personaliza el aspecto visual de la aplicación.</p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Banner del Perfil</CardTitle>
                    <CardDescription>
                        Personaliza el fondo de la tarjeta de perfil de usuario.
                        Puedes subir una imagen, ajustar su opacidad o usar un color hexadecimal (ej. #2563eb).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Subir Imagen</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>
                    {imagePreview && (
                        <div className="space-y-4">
                            <div className="relative aspect-video w-full rounded-md border overflow-hidden">
                                <Image src={imagePreview} alt="Vista previa del banner" layout="fill" objectFit="cover" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="opacity">Opacidad de la Imagen ({imageOpacity}%)</Label>
                                <Slider
                                    id="opacity"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={[imageOpacity]}
                                    onValueChange={(value) => setImageOpacity(value[0])}
                                />
                            </div>
                        </div>
                    )}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">O</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Usar Color de Fondo</Label>
                        <Input
                            placeholder="Escribe un color hexadecimal (ej: #3A5064)"
                            value={colorInput}
                            onChange={handleColorChange}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Logo del Sitio</CardTitle>
                    <CardDescription>
                        Cambia o sube el logo que se muestra en el encabezado del sitio.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Subir Logo</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                        />
                    </div>
                    {logoPreview && (
                        <div className="space-y-4">
                            <div className="relative aspect-square w-32 rounded-md border overflow-hidden">
                                <Image src={logoPreview} alt="Vista previa del logo" layout="fill" objectFit="contain" />
                            </div>
                        </div>
                    )}
                    <div className="flex gap-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={handleResetToDefault} disabled={isSaving}>
                            Restablecer a configuración predeterminada
                        </Button>
                    </div>
                </CardContent>
            </Card>



            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Modal de Bienvenida</CardTitle>
                    <CardDescription>
                        Personaliza la imagen de fondo y el texto del modal de bienvenida que ven los nuevos usuarios.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Subir Imagen de Fondo</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleWelcomeModalImageChange}
                        />
                    </div>
                    {welcomeModalImagePreview && (
                        <div className="space-y-4">
                            <div className="relative aspect-video w-full rounded-md border overflow-hidden">
                                <Image src={welcomeModalImagePreview} alt="Vista previa del modal de bienvenida" layout="fill" objectFit="cover" />
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Texto de Bienvenida</Label>
                        <Input
                            placeholder="Bienvenido a Luni Site..."
                            value={welcomeModalText}
                            onChange={(e) => setWelcomeModalText(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Pantalla de Login</CardTitle>
                    <CardDescription>
                        Personaliza la imagen de fondo de la pantalla de login.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Subir Imagen de Fondo</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLoginScreenImageChange}
                        />
                    </div>
                    {loginScreenImagePreview && (
                        <div className="space-y-4">
                            <div className="relative aspect-video w-full rounded-md border overflow-hidden">
                                <Image src={loginScreenImagePreview} alt="Vista previa de la pantalla de login" layout="fill" objectFit="cover" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Video Tutorial (Header)</CardTitle>
                    <CardDescription>
                        Configura el URL del video tutorial que se muestra en el botón del encabezado del perfil.
                        Soporta enlaces de YouTube (ej. https://www.youtube.com/embed/XXXXXX).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>URL del Video Tutorial</Label>
                        <Input
                            placeholder="https://www.youtube.com/embed/dQw4w9WgXcQ"
                            value={tutorialVideoUrl}
                            onChange={(e) => setTutorialVideoUrl(e.target.value)}
                        />
                    </div>
                    {tutorialVideoUrl && (
                        <div className="space-y-4">
                            <div className="aspect-video w-full rounded-md border overflow-hidden">
                                <iframe
                                    src={tutorialVideoUrl}
                                    title="Vista previa del tutorial"
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette /> Redes Sociales</CardTitle>
                    <CardDescription>
                        Agrega enlaces a tus perfiles de redes sociales para mostrarlos en el encabezado del sitio.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Facebook URL</Label>
                        <Input
                            placeholder="https://www.facebook.com/profile.php?id=61573801942567"
                            value={facebookUrl}
                            onChange={(e) => setFacebookUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Instagram URL</Label>
                        <Input
                            placeholder="https://instagram.com/tu-usuario"
                            value={instagramUrl}
                            onChange={(e) => setInstagramUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>TikTok URL</Label>
                        <Input
                            placeholder="https://tiktok.com/@tu-usuario"
                            value={tiktokUrl}
                            onChange={(e) => setTiktokUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>WhatsApp URL</Label>
                        <Input
                            placeholder="https://wa.me/xxxxxxxxxx"
                            value={whatsappUrl}
                            onChange={(e) => setWhatsappUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Correo de Contacto</Label>
                        <Input
                            placeholder="contacto@luni-site.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>





        </div>
    );
}
