'use client';

import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getAuth, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';

const UserIcon = () => (
  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const EmailIcon = () => (
  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const LockIcon = () => (
  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const PhoneIcon = () => (
  <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

const EyeIcon = () => (
  <svg className="toggle-password" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg className="toggle-password" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function RegisterPage() {
  const { register, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isResendMode, setIsResendMode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [lastResendTimestamp, setLastResendTimestamp] = useState<number | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState<number | null>(null);
  const [resendPassword, setResendPassword] = useState('');
  const [phone, setPhone] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState<string>('/profile');
  const { toast } = useToast();

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, [searchParams]);

  const handleGoogleRegister = async () => {
    try {
      await loginWithGoogle();
      router.push(redirectUrl);
    } catch (err) {
      console.error('Error with Google registration:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectUrl);
    }

    const storedTimestamp = localStorage.getItem('lastEmailResend');
    if (storedTimestamp) {
      setLastResendTimestamp(parseInt(storedTimestamp, 10));
    }
  }, [isAuthenticated, router, redirectUrl]);

  useEffect(() => {
    const checkResendStatus = () => {
      if (lastResendTimestamp) {
        const sixHoursInMs = 6 * 60 * 60 * 1000;
        const now = Date.now();
        const timeElapsed = now - lastResendTimestamp;

        if (timeElapsed >= sixHoursInMs) {
          setCanResend(true);
          setResendTimer(null);
        } else {
          setCanResend(false);
          setResendTimer(sixHoursInMs - timeElapsed);
        }
      } else {
        setCanResend(true); // Allow the first send if no previous record
        setResendTimer(null);
      }
    };

    checkResendStatus();
    const interval = setInterval(checkResendStatus, 1000); // Update every second

    return () => clearInterval(interval);

  }, [isAuthenticated, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      const success = await register('', email, password, false, phone);
      if (success) {
        const auth = getAuth();
        await sendEmailVerification(auth.currentUser!);
        localStorage.setItem('lastEmailResend', Date.now().toString());
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // Check if account is unverified
        try {
          const response = await fetch('/api/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await response.json();
          if (data.unverified) {
            setIsResendMode(true);
            if (data.lastResendTimestamp) {
              setLastResendTimestamp(data.lastResendTimestamp);
            }
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: data.message || "This email is already in use.",
            });
          }
        } catch (apiError) {
          console.error('Error checking verification status:', apiError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "This email is already in use.",
          });
        }
      } else {
        // Other errors are handled by register function
      }
    }
  }

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    try {
      // First, sign in the user with the provided password
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, resendPassword);
      // Now resend verification
      await sendEmailVerification(auth.currentUser!);
      const now = Date.now();
      localStorage.setItem('lastEmailResend', now.toString());
      setLastResendTimestamp(now);
      // Update server-side timestamp
      await fetch('/api/resend-verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      toast({
        title: "Correo de Verificación Enviado",
        description: "Hemos enviado un nuevo correo de verificación a tu dirección. Por favor, revisa tu bandeja de entrada (y spam).",
      });
    } catch (error: any) {
      console.error('Error resending verification:', error);
      let description = "No se pudo reenviar el correo de verificación.";
      if (error.code === 'auth/wrong-password') {
        description = "Contraseña incorrecta. Por favor, verifica tu contraseña.";
      } else if (error.code === 'auth/too-many-requests') {
        description = "Demasiados intentos. Inténtalo de nuevo más tarde.";
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: description,
      });
    } finally {
      setIsResending(false);
    }
  }

  if (isLoading || isAuthenticated) {
    return null;
  }

  if (isResendMode) {
    return (
      <div className="login-form">
        <h2 className="form-title">Cuenta ya registrada</h2>
        <p className="text-center mb-4">
          Este correo electrónico ya está registrado pero no ha sido verificado.
          Revisa tu bandeja de entrada o spam para el correo de verificación.
        </p>
        {resendTimer !== null && resendTimer > 0 && (
          <p className="text-center text-sm text-gray-600 mb-4">
            Puedes reenviar el correo en{' '}
            {Math.ceil(resendTimer / (1000 * 60 * 60))} horas{' '}
            {Math.ceil((resendTimer % (1000 * 60 * 60)) / (1000 * 60))} minutos
          </p>
        )}
        <div className="form-group">
          <label htmlFor="resendPassword" className="form-label">Contraseña</label>
          <div className="input-group">
            <LockIcon />
            <input
              type="password"
              id="resendPassword"
              className="form-input"
              placeholder="Ingresa tu contraseña"
              required
              value={resendPassword}
              onChange={(e) => setResendPassword(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleResendVerification}
          disabled={isResending || !canResend || !resendPassword}
          className={`login-button mt-6 ${(!canResend || isResending || !resendPassword) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isResending ? 'Enviando...' : 'Reenviar correo de verificación'}
        </button>
        <div className="register-link">
          <p><Link href="/login">Ir a Iniciar Sesión</Link></p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="login-form">
        <h2 className="form-title">Crear una cuenta</h2>
        <form onSubmit={handleRegister}>
          {error && <p className="text-red-500">{error}</p>}

          <div className="form-group">
            <label htmlFor="phone" className="form-label">Número de celular</label>
            <div className="input-group">
              <PhoneIcon />
              <input
                type="tel"
                id="phone"
                className="form-input"
                placeholder="+52 55 1234 5678"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <div className="input-group">
              <LockIcon />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="form-input password-input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="toggle-password cursor-pointer">
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirmar Contraseña</label>
            <div className="input-group">
              <LockIcon />
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                className="form-input password-input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="login-button mt-6">Registrarse</button>

        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">O continúa con</span>
          </div>
        </div>

        {/* Google Register Button */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-gray-700 font-medium">Continuar con Google</span>
        </button>

        <div className="register-link">
          <p>¿Olvidaste tu contraseña? <Link href="/forgot-password">Recupérala aquí</Link></p>
          <p>¿Ya tienes una cuenta? <Link href={`/login${redirectUrl !== '/profile' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}>Inicia sesión</Link></p>
        </div>
      </div>
    </>
  );
}
