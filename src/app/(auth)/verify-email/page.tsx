
'use client';

import { Logo } from '@/components/layout/Logo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { MailCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const handleGoToLogin = () => {
        router.push('/login');
    };

    return (
        <div className="login-form">
            <Logo />
            <Alert>
                <MailCheck className="h-4 w-4" />
                <AlertTitle className="font-headline">¡Un último paso!</AlertTitle>
                <AlertDescription className="space-y-4">
                    <p>
                        Hemos enviado un correo de verificación a <strong>{email || 'tu correo electrónico'}</strong>.
                    </p>
                    <p>
                        Por favor, haz clic en el enlace que encontrarás en ese correo para activar tu cuenta. Si no lo encuentras, revisa tu carpeta de spam.
                    </p>
                </AlertDescription>
            </Alert>

             <Button onClick={handleGoToLogin} className="w-full mt-6">
                Volver a Iniciar Sesión
            </Button>
        </div>
    );
}


export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
