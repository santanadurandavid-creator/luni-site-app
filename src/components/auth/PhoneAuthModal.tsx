'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface PhoneAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'login' | 'register';
}

export function PhoneAuthModal({ isOpen, onClose, mode }: PhoneAuthModalProps) {
    const { sendPhoneVerification, verifyPhoneCode } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<any>(null);
    const [step, setStep] = useState<'phone' | 'code'>('phone');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    if (!isOpen) return null;

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Format phone number to E.164 format (e.g., +521234567890)
            let formattedPhone = phoneNumber.trim();
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+52' + formattedPhone; // Default to Mexico
            }

            const result = await sendPhoneVerification(formattedPhone, 'recaptcha-container');
            setConfirmationResult(result);
            setStep('code');
        } catch (error) {
            console.error('Error sending code:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmationResult) return;

        setIsLoading(true);
        try {
            await confirmationResult.confirm(verificationCode);
            router.push('/profile');
            onClose();
        } catch (error) {
            console.error('Error verifying code:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setPhoneNumber('');
        setVerificationCode('');
        setConfirmationResult(null);
        setStep('phone');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 m-4">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {mode === 'login' ? 'Iniciar sesión' : 'Registrarse'} con teléfono
                    </h2>
                    <p className="text-sm text-gray-600 mt-2">
                        {step === 'phone'
                            ? 'Ingresa tu número de teléfono para recibir un código de verificación'
                            : 'Ingresa el código de 6 dígitos que enviamos a tu teléfono'
                        }
                    </p>
                </div>

                {/* Phone Number Step */}
                {step === 'phone' && (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                Número de teléfono
                            </label>
                            <div className="flex gap-2">
                                <div className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                                    <span className="text-gray-700 font-medium">+52</span>
                                </div>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    placeholder="5512345678"
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A5064] focus:border-transparent outline-none"
                                    required
                                    maxLength={10}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Ingresa tu número a 10 dígitos</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || phoneNumber.length !== 10}
                            className="w-full bg-[#3A5064] hover:bg-[#2d3e50] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar código'}
                        </button>
                    </form>
                )}

                {/* Verification Code Step */}
                {step === 'code' && (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                                Código de verificación
                            </label>
                            <input
                                type="text"
                                id="code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A5064] focus:border-transparent outline-none text-center text-2xl tracking-widest"
                                required
                                maxLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || verificationCode.length !== 6}
                            className="w-full bg-[#3A5064] hover:bg-[#2d3e50] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Verificando...' : 'Verificar código'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('phone')}
                            className="w-full text-[#3A5064] hover:text-[#2d3e50] font-medium py-2 transition-colors"
                        >
                            Cambiar número
                        </button>
                    </form>
                )}

                {/* reCAPTCHA Container */}
                <div id="recaptcha-container"></div>
            </div>
        </div>
    );
}
