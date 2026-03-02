# Implementación de Notificaciones de Retos con Imagen de Luni

## Resumen
Se ha implementado un sistema completo de notificaciones para los retos, usando la imagen de Luni para todas las notificaciones relacionadas con retos (tanto nativas como in-app).

## Imagen Utilizada
- **Ubicación**: `/public/challenge-notification.jpg`
- **Descripción**: Logo de Luni con escudo, espadas y elementos de gamificación
- **Uso**: Todas las notificaciones relacionadas con retos

## Cambios Realizados

### 1. Imagen de Notificación
**Archivo**: `public/challenge-notification.jpg`
- Copiada la imagen de Luni al directorio público
- Accesible desde cualquier parte de la aplicación como `/challenge-notification.jpg`

### 2. Notificación de Nuevo Reto
**Función**: `sendChallenge` en `ChallengesModal.tsx`

**Cuando se envía un reto**:
- ✅ **Notificación Push Nativa** al usuario desafiado
  - Título: "¡Nuevo Reto!"
  - Descripción: "[Nombre] te ha desafiado a un duelo de [Guía]"
  - Imagen: Logo de Luni
  - URL: `/profile?tab=retos` (abre modal de retos)

- ✅ **Notificación In-App** al usuario desafiado
  - Título: "¡Te han retado!"
  - Descripción: "[Nombre] te ha retado a un duelo de conocimiento"
  - Mensaje: "Tienes 10 minutos para aceptar el reto sobre [Guía]"
  - Imagen: Logo de Luni
  - URL: `/profile?tab=retos`

### 3. Notificación de Reto Aceptado
**Función**: `acceptChallenge` en `ChallengesModal.tsx`

**Cuando se acepta un reto**:
- ✅ **Notificación Push Nativa** al usuario que envió el reto
  - Título: "¡Reto Aceptado!"
  - Descripción: "[Nombre] ha aceptado tu reto de [Guía]"
  - Imagen: Logo de Luni
  - URL: `/profile?tab=retos` (abre modal de retos)

- ✅ **Notificación In-App** al usuario que envió el reto
  - Título: "¡Reto Aceptado!"
  - Descripción: "[Nombre] ha aceptado tu reto"
  - Mensaje: "El duelo de [Guía] está listo para comenzar"
  - Tipo: success (verde)
  - Imagen: Logo de Luni
  - URL: `/profile?tab=retos`

### 4. Notificación de Reto Rechazado
**Función**: `rejectChallenge` en `ChallengesModal.tsx`

**Cuando se rechaza un reto**:
- ✅ **Notificación Push Nativa** al usuario que envió el reto
  - Título: "Reto Rechazado"
  - Descripción: "[Nombre] ha rechazado tu reto de [Guía]"
  - Imagen: Logo de Luni
  - URL: `/profile?tab=retos` (abre modal de retos)

- ✅ **Notificación In-App** al usuario que envió el reto
  - Título: "Reto Rechazado"
  - Descripción: "[Nombre] ha rechazado tu reto"
  - Mensaje: "El reto de [Guía] no fue aceptado"
  - Tipo: warning (amarillo)
  - Imagen: Logo de Luni
  - URL: `/profile?tab=retos`

## Flujo Completo de Notificaciones

### Escenario 1: Usuario A envía reto a Usuario B
1. **Usuario A** hace clic en "Retar" a Usuario B
2. **Usuario B** recibe:
   - Notificación push nativa (si tiene permisos) con imagen de Luni
   - Notificación in-app con imagen de Luni
3. Al hacer clic en cualquiera de las notificaciones:
   - Se abre el modal de retos directamente
   - Se muestra la pestaña "Retos" con el reto pendiente

### Escenario 2: Usuario B acepta el reto
1. **Usuario B** hace clic en "Aceptar"
2. **Usuario A** recibe:
   - Notificación push nativa (si tiene permisos) con imagen de Luni
   - Notificación in-app (verde) con imagen de Luni
3. Al hacer clic en cualquiera de las notificaciones:
   - Se abre el modal de retos directamente
   - Se muestra el reto aceptado listo para comenzar

### Escenario 3: Usuario B rechaza el reto
1. **Usuario B** hace clic en "Rechazar"
2. **Usuario A** recibe:
   - Notificación push nativa (si tiene permisos) con imagen de Luni
   - Notificación in-app (amarilla) con imagen de Luni
3. Al hacer clic en cualquiera de las notificaciones:
   - Se abre el modal de retos directamente
   - El reto aparece como rechazado

## Características Implementadas

### ✅ Deep Linking
- Todas las notificaciones de retos usan `/profile?tab=retos`
- Al hacer clic, se abre el modal de retos directamente (no navega a página)
- Funciona tanto en notificaciones nativas como in-app

### ✅ Imagen Consistente
- Todas las notificaciones de retos usan la misma imagen de Luni
- Branding consistente en toda la experiencia de retos
- Imagen visualmente atractiva que representa gamificación

### ✅ Notificaciones Bidireccionales
- Usuario desafiado recibe notificación al recibir reto
- Usuario retador recibe notificación cuando se acepta/rechaza
- Comunicación completa del estado del reto

### ✅ Tipos de Notificación Apropiados
- `info` (azul): Nuevo reto recibido
- `success` (verde): Reto aceptado
- `warning` (amarillo): Reto rechazado

## Testing

### Probar Nuevo Reto
1. Usuario A reta a Usuario B
2. Verificar que Usuario B recibe:
   - Notificación push con imagen de Luni
   - Notificación in-app con imagen de Luni
3. Hacer clic en notificación → debe abrir modal de retos

### Probar Aceptar Reto
1. Usuario B acepta el reto
2. Verificar que Usuario A recibe:
   - Notificación push con imagen de Luni (verde)
   - Notificación in-app con imagen de Luni (verde)
3. Hacer clic en notificación → debe abrir modal de retos

### Probar Rechazar Reto
1. Usuario B rechaza el reto
2. Verificar que Usuario A recibe:
   - Notificación push con imagen de Luni (amarillo)
   - Notificación in-app con imagen de Luni (amarillo)
3. Hacer clic en notificación → debe abrir modal de retos

## Notas Técnicas

- La imagen se sirve desde `/public/challenge-notification.jpg`
- Las notificaciones push requieren permisos del usuario
- Las notificaciones in-app siempre se muestran
- El deep linking funciona en ambos tipos de notificaciones
- El service worker maneja las notificaciones push nativas
- El componente Notifications maneja las notificaciones in-app

## Mejoras Futuras Posibles

1. Animación al recibir notificación de reto
2. Sonido personalizado para notificaciones de reto
3. Contador de retos pendientes en el badge
4. Historial de notificaciones de retos
5. Configuración para silenciar notificaciones de retos
