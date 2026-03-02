
import React from 'react';

const PrivacyPage = () => {
  const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Política de Privacidad de Luni Site</h1>
      <p><strong>Última actualización:</strong> {today}</p>

      <h2>1. Información que recopilamos</h2>
      <p>
        Recopilamos información para proporcionar y mejorar nuestros servicios. Los tipos de
        información que recopilamos incluyen:
      </p>
      <ul>
        <li>
          <strong>Información de la cuenta:</strong> Cuando te registras, recopilamos tu nombre, dirección de
          correo electrónico y contraseña (cifrada).
        </li>
        <li>
          <strong>Información de uso:</strong> Recopilamos datos sobre cómo interactúas con nuestro Servicio, como
          los exámenes que realizas, tu progreso y el tiempo de estudio.
        </li>
        <li>
          <strong>Inicio de sesión con Google:</strong> Si decides iniciar sesión con Google, recopilaremos la información
          básica de tu perfil, como tu nombre, correo electrónico y foto de perfil, según lo permitido
          por tu configuración de Google.
        </li>
      </ul>

      <h2>2. Cómo usamos la información</h2>
      <p>
        Usamos la información que recopilamos para los siguientes propósitos:
      </p>
      <ul>
        <li>Para proporcionar, mantener y mejorar nuestro Servicio.</li>
        <li>Para personalizar tu experiencia de aprendizaje.</li>
        <li>Para comunicarnos contigo, incluyendo notificaciones sobre tu cuenta y nuestro Servicio.</li>
        <li>Para garantizar la seguridad de nuestra plataforma.</li>
      </ul>

      <h2>3. Cómo compartimos tu información</h2>
      <p>
        No compartimos tu información personal con empresas, organizaciones o individuos fuera
        de Luni Site, excepto en las siguientes circunstancias:
      </p>
      <ul>
        <li><strong>Con tu consentimiento:</strong> Compartiremos información personal cuando tengamos tu consentimiento para hacerlo.</li>
        <li>
          <strong>Por razones legales:</strong> Compartiremos información si creemos de buena fe que es
          necesario para cumplir con una obligación legal, proteger nuestros derechos, o detectar
          y prevenir el fraude.
        </li>
      </ul>

      <h2>4. Seguridad de los datos</h2>
      <p>
        Nos esforzamos por proteger tu información personal. Utilizamos medidas de seguridad
        administrativas, técnicas y físicas para proteger tus datos contra el acceso no autorizado,
        la divulgación o la destrucción.
      </p>

      <h2>5. Tus Derechos</h2>
      <p>
        Tienes derecho a acceder, actualizar o eliminar tu información personal. Puedes revisar
        y actualizar la información de tu cuenta directamente desde tu perfil de usuario.
      </p>

      <h2>6. Cambios a esta Política de Privacidad</h2>
      <p>
        Podemos actualizar nuestra Política de Privacidad de vez en cuando. Te notificaremos
        de cualquier cambio publicando la nueva política en esta página.
      </p>

      <h2>7. Contáctanos</h2>
      <p>
        Si tienes alguna pregunta sobre esta Política de Privacidad, por favor contáctanos en
        [tu correo de soporte].
      </p>
    </div>
  );
};

export default PrivacyPage;
