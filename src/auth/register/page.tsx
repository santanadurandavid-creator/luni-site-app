
'use client';

import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WelcomeModal } from '@/components/auth/WelcomeModal';
import { useToast } from '@/hooks/use-toast';

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
  const { register, isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, router]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register(name, email, password);
  }

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <>
      <WelcomeModal isOpen={isWelcomeModalOpen} setIsOpen={setIsWelcomeModalOpen} />
      <div className="login-form">
        <h2 className="form-title">Crear una cuenta</h2>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Nombre completo</label>
            <div className="input-group">
              <UserIcon />
              <input 
                type="text" 
                id="name" 
                className="form-input" 
                placeholder="Tu Nombre" 
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Correo electrónico</label>
            <div className="input-group">
              <EmailIcon />
              <input 
                type="email" 
                id="email" 
                className="form-input" 
                placeholder="ejemplo@correo.com" 
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
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

          <button type="submit" className="login-button mt-6">Registrarse</button>
        </form>

        <div className="register-link">
          <p>¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link></p>
        </div>
      </div>
    </>
  );
}
