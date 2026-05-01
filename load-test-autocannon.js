const autocannon = require('autocannon');

const BASE_URL = 'https://www.bcb-global.com/api';

const defaults = {
  connections: 100,
  duration: 30,
  headers: {
    'Content-Type': 'application/json',
  },
};

const scenarios = [
  { name: 'ESCENARIO 1: 50 usuarios', connections: 50, duration: 30 },
  { name: 'ESCENARIO 2: 100 usuarios', connections: 100, duration: 30 },
  { name: 'ESCENARIO 3: 200 usuarios', connections: 200, duration: 30 },
  { name: 'ESCENARIO 4: 300 usuarios', connections: 300, duration: 30 },
];

async function runLoadTest(name, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(name);
  console.log('='.repeat(60));

  try {
    const result = await autocannon({
      ...defaults,
      ...options,
      url: `${BASE_URL}/public-content`,
    });

    console.log(`\n--- Resultados ---`);
    console.log(`Requests: ${result.requests.total}`);
    console.log(`RPS medio: ${result.requests.mean}`);
    console.log(`Latencia media: ${result.latency.mean}ms`);
    console.log(`Latencia p50: ${result.latency.p50}ms`);
    console.log(`Latencia p99: ${result.latency.p99}ms`);
    console.log(`Errores: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);

    if (result.errors > 0 || result.timeouts > 0) {
      console.log(`\n⚠️ DETECTADO PROBLEMA: Errores o timeouts`);
    }

    return result;
  } catch (err) {
    console.error(`Error en ${name}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('BCB GLOBAL - PRUEBAS DE CARGA');
  console.log('==============================');

  for (const scenario of scenarios) {
    await runLoadTest(scenario.name, {
      connections: scenario.connections,
      duration: scenario.duration,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('\n\n=== PRUEBA COMPLETADA ===');
  process.exit(0);
}

main().catch(console.error);
