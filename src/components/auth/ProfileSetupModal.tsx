'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { X, Upload } from 'lucide-react';
import Image from 'next/image';

interface ProfileSetupModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export function ProfileSetupModal({ isOpen, onComplete }: ProfileSetupModalProps) {
    const { updateUser } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await updateUser({
                name,
                phone,
                newAvatarFile: avatarFile,
            });
            onComplete();
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 m-4">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Completa tu perfil
                    </h2>
                    <p className="text-sm text-gray-600">
                        Necesitamos algunos datos para personalizar tu experiencia
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            {avatarPreview ? (
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#3A5064]">
                                    <Image
                                        src={avatarPreview}
                                        alt="Avatar preview"
                                        width={96}
                                        height={96}
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                                id="avatar-upload"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="absolute bottom-0 right-0 bg-[#3A5064] text-white p-2 rounded-full cursor-pointer hover:bg-[#2d3e50] transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Foto de perfil (opcional)</p>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre completo *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tu nombre"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A5064] focus:border-transparent outline-none"
                            required
                        />
                    </div>

                    {/* Phone Input */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Número de teléfono *
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+52 55 1234 5678"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3A5064] focus:border-transparent outline-none"
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !name || !phone}
                        className="w-full bg-[#3A5064] hover:bg-[#2d3e50] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Guardando...' : 'Continuar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
