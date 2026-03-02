# Implementación de Deep Linking para Notificaciones de Retos

## Resumen
Se ha implementado la funcionalidad de deep linking para que cuando un usuario recibe una notificación de reto (ya sea nativa o dentro de la app), al hacer clic en ella se abra directamente el modal de retos en lugar de navegar a una página.

## Cambios Realizados

### 1. Service Worker (`firebase-messaging-sw.js`)
**Cambio**: Detecta URLs de retos y envía un mensaje al cliente en lugar de navegar.

**Funcionamiento**:
- Cuando se hace clic en una notificación push nativa con URL `/profile?tab=retos`
- El service worker detecta que es una URL de retos
- En lugar de navegar, envía un mensaje `postMessage` al cliente con tipo `OPEN_CHALLENGES_MODAL`
- Si la app ya está abierta, enfoca la ventana y envía el mensaje
- Si la app no está abierta, abre una nueva ventana con la URL

### 2. ProfileHeaderCard (`src/components/profile/ProfileHeaderCard.tsx`)
**Cambios**:
- Agregado estado `retosInitialTab` para controlar en qué pestaña se abre el modal
- Agregado listener para eventos personalizados `openChallengesModal` (notificaciones in-app)
- Agregado listener para mensajes del service worker (notificaciones push nativas)
- Ambos listeners establecen el tab inicial y abren el modal

**Listeners implementados**:
1. **URL params**: Detecta `?tab=retos` en la URL
2. **Custom events**: Escucha eventos `openChallengesModal` disparados por notificaciones in-app
3. **Service Worker messages**: Escucha mensajes del tipo `OPEN_CHALLENGES_MODAL` del service worker

### 3. Notifications Component (`src/components/layout/Notifications.tsx`)
**Cambios**:
- Actualizado `handleNotificationClick` para detectar URLs de retos y disparar evento personalizado
- Actualizado `viewPopupNotification` para manejar URLs de retos de la misma manera
- Ambos métodos ahora abren el modal en lugar de navegar cuando detectan `/profile?tab=retos`

### 4. ChallengesModal (`src/components/profile/ChallengesModal.tsx`)
**Cambios**:
- Actualizado el `useEffect` que controla `activeTab` para usar el prop `initialTab`
- Ahora respeta la pestaña inicial especificada cuando se abre el modal
- Agregada dependencia `isOpen` para que se actualice cada vez que se abre el modal

## Flujo de Funcionamiento

### Notificación Push Nativa (App cerrada o en background)
1. Usuario recibe notificación push con URL `/profile?tab=retos`
2. Usuario hace clic en la notificación
3. Service worker intercepta el clic
4. Si la app está abierta:
   - Enfoca la ventana
   - Envía mensaje `OPEN_CHALLENGES_MODAL` al cliente
   - ProfileHeaderCard recibe el mensaje
   - Establece `retosInitialTab = 'retos'`
   - Abre el modal con `setIsRetosModalOpen(true)`
5. Si la app no está abierta:
   - Abre nueva ventana con URL `/profile?tab=retos`
   - ProfileHeaderCard detecta el parámetro URL
   - Abre el modal automáticamente

### Notificación In-App (Popup o lista de notificaciones)
1. Usuario hace clic en notificación con URL `/profile?tab=retos`
2. Notifications component detecta la URL de retos
3. Dispara evento personalizado `openChallengesModal`
4. ProfileHeaderCard escucha el evento
5. Establece `retosInitialTab = 'retos'`
6. Abre el modal con `setIsRetosModalOpen(true)`

### Notificación In-App (Popup emergente)
1. Usuario hace clic en botón "Ver" del popup
2. `viewPopupNotification` detecta URL de retos
3. Dispara evento personalizado `openChallengesModal`
4. Mismo flujo que notificación in-app

## Ventajas de esta Implementación

1. **Experiencia de usuario mejorada**: No hay navegación innecesaria, el modal se abre directamente
2. **Consistencia**: Mismo comportamiento para notificaciones nativas e in-app
3. **Flexibilidad**: El sistema puede extenderse fácilmente para otros tipos de deep links
4. **Performance**: Evita recargas de página innecesarias
5. **PWA-friendly**: Funciona perfectamente con Progressive Web Apps

## Testing

Para probar la funcionalidad:

1. **Notificación Push Nativa**:
   - Enviar una notificación push con URL `/profile?tab=retos`
   - Hacer clic en la notificación cuando la app está abierta
   - Verificar que el modal de retos se abre directamente

2. **Notificación In-App**:
   - Crear una notificación con URL `/profile?tab=retos`
   - Hacer clic en la notificación desde el popover
   - Verificar que el modal de retos se abre directamente

3. **Popup de Notificación**:
   - Esperar a que aparezca un popup de notificación de reto
   - Hacer clic en "Ver"
   - Verificar que el modal de retos se abre directamente

## Notas Técnicas

- El service worker necesita ser actualizado en el navegador. Puede requerir un hard refresh (Ctrl+Shift+R) o desregistrar el service worker anterior
- Los mensajes del service worker solo funcionan cuando la app está abierta
- Si la app no está abierta, se usa la navegación tradicional con parámetros URL
- El sistema es compatible con múltiples pestañas/ventanas abiertas
