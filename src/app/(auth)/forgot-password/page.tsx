'use client';

import { useToast } from "@/hooks/use-toast"
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFirebaseServices } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";

const EmailIcon = () => (
    <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);


export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address.",
      });
      return;
    }

    try {
      const { auth } = getFirebaseServices();

      // Firebase automatically handles if the email exists or not for security reasons.
      // It won't reveal if an account exists or not.
      await sendPasswordResetEmail(auth, email);

      toast({
        title: "Correo enviado",
        description: "Si tu email está registrado, recibirás un enlace para recuperar tu contraseña. Por favor, revisa también tu carpeta de spam.",
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      let errorMessage = "No se pudo enviar el correo de recuperación. Inténtalo de nuevo.";

      // Firebase errors for sendPasswordResetEmail
      if (error.code === 'auth/invalid-email') {
        errorMessage = "La dirección de correo electrónico no es válida.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.";
      } else if (error.code === 'auth/user-not-found') {
        // For security, Firebase often behaves as if the email was sent,
        // even if the user is not found, to prevent enumeration.
        // We'll show a generic success message for this specific case too, 
        // as the email won't actually be sent if the user doesn't exist.
        toast({
          title: "Correo enviado",
          description: "Si tu email está registrado, recibirás un enlace para recuperar tu contraseña. Por favor, revisa también tu carpeta de spam.",
        });
        router.push('/login');
        return;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  return (
    <div className="login-form">
      <h2 className="form-title">¿Olvidaste tu contraseña?</h2>
      <p className="form-description">Ingresa tu email y te enviaremos un enlace para recuperarla.</p>
      <form onSubmit={handleSubmit}>
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

        <button type="submit" className="login-button">Enviar enlace</button>

      </form>
       <div className="register-link">
        <p><Link href="/login">Volver a Iniciar Sesión</Link></p>
      </div>
    </div>
  );
}
