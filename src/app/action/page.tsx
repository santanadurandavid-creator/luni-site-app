'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getFirebaseServices } from '@/lib/firebase';
import { applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';

function BubbleBackground() {
    const bubbles = [
        { size: 16, color: 'bg-pink-400/60', delay: 0, duration: 4, x: 10, y: 20 },
        { size: 24, color: 'bg-blue-500/50', delay: 0.5, duration: 5, x: 80, y: 70 },
        { size: 20, color: 'bg-pink-500/50', delay: 1, duration: 4.5, x: 30, y: 60 },
        { size: 18, color: 'bg-blue-400/60', delay: 1.5, duration: 5.5, x: 70, y: 30 },
        { size: 22, color: 'bg-pink-400/50', delay: 2, duration: 4.8, x: 50, y: 80 },
        { size: 16, color: 'bg-blue-500/60', delay: 2.5, duration: 5.2, x: 20, y: 40 },
    ];

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {bubbles.map((bubble, i) => (
                <div
                    key={i}
                    className={`absolute rounded-full ${bubble.color} animate-bubble-bounce`}
                    style={{
                        width: `${bubble.size}px`,
                        height: `${bubble.size}px`,
                        left: `${bubble.x}%`,
                        top: `${bubble.y}%`,
                        animationDelay: `${bubble.delay}s`,
                        animationDuration: `${bubble.duration}s`
                    }}
                />
            ))}
        </div>
    );
}

function ActionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    // State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'input'>('loading');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');

    const getErrorMessage = (error: any) => {
        switch (error.code) {
            case 'auth/expired-action-code':
                return 'El enlace ha expirado. Por favor solicita uno nuevo.';
            case 'auth/invalid-action-code':
                return 'El enlace es inválido o ya ha sido usado.';
            case 'auth/user-disabled':
                return 'El usuario ha sido deshabilitado.';
            case 'auth/user-not-found':
                return 'Usuario no encontrado.';
            case 'auth/weak-password':
                return 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
            default:
                return error.message || 'Ocurrió un error desconocido.';
        }
    };

    useEffect(() => {
        if (!oobCode) {
            setStatus('error');
            setMessage('Código de verificación inválido o faltante.');
            return;
        }

        const { auth } = getFirebaseServices();

        const handleVerifyEmail = async () => {
            try {
                await applyActionCode(auth, oobCode);
                setStatus('success');
                setMessage('¡Tu correo ha sido verificado exitosamente!');
            } catch (error: any) {
                setStatus('error');
                setMessage(getErrorMessage(error));
            }
        };

        const handleResetPassword = async () => {
            try {
                const email = await verifyPasswordResetCode(auth, oobCode);
                setEmail(email);
                setStatus('input');
            } catch (error: any) {
                setStatus('error');
                setMessage(getErrorMessage(error));
            }
        };

        if (mode === 'verifyEmail') {
            handleVerifyEmail();
        } else if (mode === 'resetPassword') {
            handleResetPassword();
        } else {
            setStatus('error');
            setMessage('Modo de acción desconocido.');
        }
    }, [mode, oobCode]);

    const submitNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage('Las contraseñas no coinciden.');
            setStatus('input'); // Keep in input mode but show error
            return;
        }
        if (newPassword.length < 6) {
            setMessage('La contraseña debe tener al menos 6 caracteres.');
            setStatus('input');
            return;
        }

        setStatus('loading');
        const { auth } = getFirebaseServices();
        try {
            if (oobCode) {
                await confirmPasswordReset(auth, oobCode, newPassword);
                setStatus('success');
                setMessage('¡Tu contraseña ha sido restablecida exitosamente!');
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(getErrorMessage(error));
        }
    };

    return (
        <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 text-white">
            <div className="flex flex-col items-center text-center">
                {/* Logo */}
                <div className="mb-6 p-2 bg-white rounded-2xl shadow-lg border border-white/20">
                    <img src="/images/luni-logo.png" alt="Luni" className="w-16 h-16 object-contain" />
                </div>

                {status === 'loading' && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-300" />
                        <h2 className="text-xl font-semibold">Procesando...</h2>
                        <p className="text-blue-100 mt-2">Por favor espera un momento.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-16 h-16 mb-4 text-green-400" />
                        <h2 className="text-2xl font-bold mb-2">¡Éxito!</h2>
                        <p className="text-blue-100 mb-6">{message}</p>
                        <Link
                            href="/login"
                            className="px-8 py-3 bg-white text-[#3A5064] rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg flex items-center gap-2"
                        >
                            Ir a Iniciar Sesión
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <XCircle className="w-16 h-16 mb-4 text-red-400" />
                        <h2 className="text-2xl font-bold mb-2">Error</h2>
                        <p className="text-red-100 mb-6">{message}</p>
                        <Link
                            href="/login"
                            className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                        >
                            Volver al inicio
                        </Link>
                    </div>
                )}

                {status === 'input' && mode === 'resetPassword' && (
                    <form onSubmit={submitNewPassword} className="w-full animate-in fade-in zoom-in duration-300">
                        <h2 className="text-2xl font-bold mb-2">Restablecer Contraseña</h2>
                        <p className="text-blue-100 mb-6 text-sm">Ingresa tu nueva contraseña para {email}</p>

                        {message && !message.includes('exitosamente') && (
                            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-100">
                                {message}
                            </div>
                        )}

                        <div className="space-y-4 mb-6">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nueva contraseña"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirmar contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Cambiar Contraseña
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ActionPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#3A5064' }}>
            <BubbleBackground />
            <Suspense fallback={<Loader2 className="w-12 h-12 text-white animate-spin relative z-10" />}>
                <ActionContent />
            </Suspense>
        </div>
    );
}
