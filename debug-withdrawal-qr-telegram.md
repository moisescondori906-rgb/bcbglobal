# Debug Session: withdrawal-qr-telegram

Status: OPEN

## Síntoma
- Los retiros VIP y pasante llegan a Telegram sin imagen QR.
- Se espera que VIP llegue con imagen al admin.
- Se espera que pasante llegue al invitador según la regla vigente y luego, al aprobarse, llegue con imagen al admin.

## Hipótesis
1. El frontend no está enviando `comprobante_url` en algunos caminos reales de solicitud.
2. El backend guarda el retiro pero no persiste correctamente `comprobante_url` en la base de datos.
3. El backend sí guarda el QR, pero Telegram recibe un `photo` inválido o vacío al momento de enviar.
4. El archivo QR se guarda en disco, pero no puede releerse después para el reenvío al admin.
5. La ruta o el bot que envía el mensaje final a Telegram está usando opciones distintas y descarta `photo`.

## Evidencia a recolectar
- Payload real recibido por `POST /api/withdrawals`
- Resultado real del guardado de `comprobante_url`
- Estado real del buffer/archivo antes de `sendToAdmin`, `sendToRetiros` o `sendToTelegramUser`
- Respuesta/error real del bot de Telegram al intentar enviar foto

## Archivos candidatos
- `frontend/src/pages/Withdrawal.jsx`
- `backend/src/handlers/api/withdrawals.mjs`
- `backend/src/services/dbService.mjs`
- `backend/src/services/telegramBot.mjs`
- `backend/src/utils/fileStorage.mjs`

## Próximo paso
- Inspección de código y preparación de instrumentación mínima basada en evidencia.
