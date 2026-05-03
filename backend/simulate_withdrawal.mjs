import dotenv from 'dotenv';
import { 
  sendToAdmin, 
  sendToRetiros, 
  formatRetiroMessage 
} from './src/services/telegramBot.mjs';
import logger from './src/utils/logger.mjs';

dotenv.config();

async function runSimulation() {
  logger.info('🚀 Iniciando simulación de retiro...');

  const mockData = {
    telefono: '+59170000000',
    nivel: 'GLOBAL 3',
    monto: 500,
    banco: 'Banco Unión',
    cuenta: '123456789',
    hora: new Date().toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' })
  };

  const message = formatRetiroMessage(mockData);
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📝 Tomar Caso (SIMULADO)", callback_data: `retiro_tomar_simulacion_id` }
        ]
      ]
    }
  };

  try {
    logger.info('📤 Enviando mensaje a Bot de Administración...');
    await sendToAdmin(message, options);
    
    logger.info('📤 Enviando mensaje a Bot de Retiros...');
    await sendToRetiros(message, options);
    
    logger.info('✅ Simulación completada con éxito. Revisa tus grupos de Telegram.');
  } catch (err) {
    logger.error('❌ Error en la simulación:', err.message);
  } finally {
    process.exit(0);
  }
}

runSimulation();
