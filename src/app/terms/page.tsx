
import React from 'react';

const TermsPage = () => {
  const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', lineHeight: '1.6', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Términos y Condiciones de Uso de Luni Site</h1>
      <p><strong>Última actualización:</strong> {today}</p>

      <h2>1. Aceptación de los Términos</h2>
      <p>
        Bienvenido a Luni Site (en adelante, "el Servicio"). Al acceder y utilizar nuestro
        Servicio, aceptas estar sujeto a estos Términos y Condiciones ("Términos"). Si no
        estás de acuerdo con alguna parte de los términos, no podrás acceder al Servicio.
      </p>

      <h2>2. Descripción del Servicio</h2>
      <p>
        Luni Site es una plataforma educativa diseñada para ayudar a los usuarios a prepararse
        para sus exámenes de admisión a través de simuladores de examen, material de estudio
        y seguimiento del progreso.
      </p>

      <h2>3. Cuentas de Usuario</h2>
      <p>
        Para acceder a ciertas funciones del Servicio, es posible que debas registrarte y crear
        una cuenta. Eres responsable de mantener la confidencialidad de tu contraseña y de
        todas las actividades que ocurran en tu cuenta. Aceptas notificarnos inmediatamente
        de cualquier uso no autorizado de tu cuenta.
      </p>

      <h2>4. Uso del Servicio</h2>
      <p>
        Te comprometes a utilizar el Servicio únicamente con fines lícitos y de acuerdo con estos
        Términos. No utilizarás el Servicio para ningún propósito que sea ilegal o que esté
        prohibido por estos Términos.
      </p>

      <h2>5. Propiedad Intelectual</h2>
      <p>
        El Servicio y su contenido original, características y funcionalidad son y seguirán
        siendo propiedad exclusiva de Luni Site y sus licenciantes. El Servicio está protegido
        por derechos de autor, marcas comerciales y otras leyes.
      </p>

      <h2>6. Finalización</h2>
      <p>
        Podemos suspender o cancelar tu cuenta y el acceso al Servicio de inmediato, sin previo
        aviso ni responsabilidad, por cualquier motivo, incluido, entre otros, el incumplimiento
        de los Términos.
      </p>

      <h2>7. Limitación de Responsabilidad</h2>
      <p>
        En ningún caso Luni Site, ni sus directores o empleados, serán responsables de daños
        indirectos, incidentales, especiales, consecuentes o punitivos resultantes de tu
        acceso o uso del Servicio.
      </p>

      <h2>8. Cambios en los Términos</h2>
      <p>
        Nos reservamos el derecho de modificar o reemplazar estos Términos en cualquier momento.
        Te notificaremos de cualquier cambio importante.
      </p>

      <h2>9. Contáctanos</h2>
      <p>
        Si tienes alguna pregunta sobre estos Términos, por favor contáctanos en [tu correo de soporte].
      </p>
    </div>
  );
};

export default TermsPage;
