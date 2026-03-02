
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState, ReactNode } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Verification Component ---
function VerificationScreen({ status, message }: { status: 'loading' | 'success' | 'error', message: string }) {
    const router = useRouter();

    const renderIcon = () => {
        switch (status) {
            case 'loading': return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
            case 'success': return <MailCheck className="h-12 w-12 text-green-500" />;
            case 'error': return <AlertTriangle className="h-12 w-12 text-destructive" />;
        }
    };

    const title = () => {
        switch (status) {
            case 'loading': return 'Procesando...';
            case 'success': return '¡Éxito!';
            case 'error': return 'Error';
        }
    }

    return (
        <Card className="w-full max-w-md text-center p-8">
            {renderIcon()}
            <CardTitle className="text-2xl mt-4">{title()}</CardTitle>
            <CardDescription className="mt-2">{message}</CardDescription>
            {status !== 'loading' && (
                <Button onClick={() => router.push('/login')} className="w-full mt-6">
                    Ir a Iniciar Sesión
                </Button>
            )}
        </Card>
    );
}


// --- Password Reset Component ---
function ResetPasswordForm({ actionCode }: { actionCode: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkCode = async () => {
            try {
                const { auth } = getFirebaseServices();
                await verifyPasswordResetCode(auth, actionCode);
            } catch (err) {
                setError('El enlace no es válido o ha expirado. Por favor, solicita uno nuevo.');
            } finally {
                setIsVerifying(false);
            }
        };
        checkCode();
    }, [actionCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas no coinciden.' });
            return;
        }
        if (newPassword.length < 6) {
             toast({ variant: 'destructive', title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const { auth } = getFirebaseServices();
            await confirmPasswordReset(auth, actionCode, newPassword);
            toast({ title: 'Éxito', description: 'Tu contraseña ha sido restablecida. Ahora puedes iniciar sesión.' });
            router.push('/login');
        } catch (error) {
            setError('No se pudo restablecer la contraseña. El enlace puede haber expirado.');
            setIsSubmitting(false);
        }
    };

    if (isVerifying) {
        return <VerificationScreen status="loading" message="Verificando enlace..." />;
    }
    
    if (error) {
        return <VerificationScreen status="error" message={error} />;
    }

    return (
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
                <KeyRound className="mx-auto h-12 w-12 text-primary" />
                <CardTitle>Restablecer Contraseña</CardTitle>
                <CardDescription>Introduce tu nueva contraseña a continuación.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Nueva Contraseña</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Contraseña
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// --- Main Handler Component ---
function ActionHandler() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando tu correo electrónico...');
    
    const mode = searchParams.get('mode');
    const actionCode = searchParams.get('oobCode');

    useEffect(() => {
        const handleAction = async () => {
            if (!actionCode) {
                 setStatus('error');
                 setMessage('El enlace no es válido o ha expirado.');
                 return;
            }

            if (mode === 'verifyEmail') {
                const { auth } = getFirebaseServices();
                try {
                    await applyActionCode(auth, actionCode);
                    setStatus('success');
                    setMessage('¡Tu correo ha sido verificado con éxito! Ahora puedes iniciar sesión.');
                } catch (error: any) {
                    setStatus('error');
                    setMessage('El enlace no es válido o ha expirado.');
                }
            }
        };
        
        if (mode === 'verifyEmail') {
             handleAction();
        }

    }, [mode, actionCode, toast]);
    
    let content: ReactNode;
    if (mode === 'verifyEmail') {
        content = <VerificationScreen status={status} message={message} />;
    } else if (mode === 'resetPassword' && actionCode) {
        content = <ResetPasswordForm actionCode={actionCode} />;
    } else {
        content = <VerificationScreen status="error" message="El enlace no es válido o está incompleto." />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#2d4155] p-4">
            {content}
        </div>
    );
}


export default function LoginVerificationPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#2d4155] p-4">
            <Card className="w-full max-w-md text-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Cargando...</p>
            </Card>
        </div>
    }>
      <ActionHandler />
    </Suspense>
  );
}
