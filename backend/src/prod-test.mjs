import logger from './utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 4000}`;

async function runTests() {
  logger.info('🚀 Iniciando pruebas de estabilidad en producción...');

  const tests = [
    {
      name: 'Health Check',
      url: '/health',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Auth - Login (Attempt)',
      url: '/api/auth/login',
      method: 'POST',
      body: { telefono: '12345678', password: 'wrong' },
      expectedStatus: 401
    },
    {
      name: 'Admin - Protected Route',
      url: '/api/admin/dashboard',
      method: 'GET',
      expectedStatus: 401 // Debe fallar sin token
    }
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (test.body) options.body = JSON.stringify(test.body);

      const res = await fetch(`${BASE_URL}${test.url}`, options);
      
      if (res.status === test.expectedStatus) {
        logger.info(`✅ [PASS] ${test.name}`);
        passed++;
      } else {
        logger.error(`❌ [FAIL] ${test.name} - Status: ${res.status} (Esperado: ${test.expectedStatus})`);
      }
    } catch (err) {
      logger.error(`❌ [ERROR] ${test.name} - ${err.message}`);
    }
  }

  logger.info(`📊 Resultado: ${passed}/${tests.length} pruebas completadas.`);
  
  if (passed === tests.length) {
    logger.info('🎉 El sistema está listo para producción.');
    process.exit(0);
  } else {
    logger.error('⚠️ El sistema tiene fallos críticos.');
    process.exit(1);
  }
}

// Ejecutar si el servidor está arriba
runTests();
