const autocannon = require('autocannon');

const BASE_URL = 'https://www.bcb-global.com/api';

const scenarios = [
  { name: 'ESCENARIO 1: 100 usuarios', connections: 100, duration: 30 },
  { name: 'ESCENARIO 2: 200 usuarios', connections: 200, duration: 30 },
  { name: 'ESCENARIO 3: 300 usuarios', connections: 300, duration: 30 },
];

async function runLoadTestDetailed(name, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(name);
  console.log('='.repeat(60));

  try {
    const result = await autocannon({
      ...options,
      url: `${BASE_URL}/public-content`,
      connections: options.connections,
      duration: options.duration,
      headers: {
        'Content-Type': 'application/json',
      },
      requests: [
        {
          method: 'GET',
          path: '/public-content',
        }
      ],
    });

    console.log(`\n--- Resultados Detallados ---`);
    console.log(`Requests Totales: ${result.requests.total}`);
    console.log(`RPS medio: ${result.requests.mean.toFixed(2)}`);
    console.log(`Latencia Media: ${result.latency.mean.toFixed(2)}ms`);
    console.log(`Latencia p50: ${result.latency.p50}ms`);
    console.log(`Latencia p95: ${result.latency.p95}ms`);
    console.log(`Latencia p99: ${result.latency.p99}ms`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log(`Non2xx: ${result.non2xx}`);

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
  console.log('BCB GLOBAL - PRUEBAS DE CARGA DETALLADAS');
  console.log('==========================================');

  for (const scenario of scenarios) {
    await runLoadTestDetailed(scenario.name, {
      connections: scenario.connections,
      duration: scenario.duration,
    });
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('\n\n=== PRUEBA COMPLETADA ===');
  console.log('\nNOTA: Los errores 429 = Rate Limit, 5xx = Server Error, timeouts = servidor saturado');
  process.exit(0);
}

main().catch(console.error);
