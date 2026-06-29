import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginTime = new Trend('login_duration');
const tasksTime = new Trend('tasks_duration');
const meTime = new Trend('me_duration');
const levelsTime = new Trend('levels_duration');
const statsTime = new Trend('stats_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';

const users = [
  { username: 'admin', password: 'admin123', isAdmin: true },
  { username: 'alexj', password: '123456', isAdmin: false },
];

function getRandomUser() {
  return users[Math.floor(Math.random() * users.length)];
}

export let options = {
  scenarios: {
    // Escenario 1: 50 usuarios concurrentes por 30 segundos
    escenario_50: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  const user = getRandomUser();
  let token = null;

  // 1. LOGIN
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: user.username, password: user.password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginTime.add(loginRes.timings.duration);

  const loginSuccess = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.token;
      } catch {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  try {
    token = JSON.parse(loginRes.body).token;
  } catch {
    errorRate.add(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. OBTENER USUARIO (me)
  const meRes = http.get(`${BASE_URL}/users/me`, { headers });
  meTime.add(meRes.timings.duration);

  check(meRes, {
    'me status 200': (r) => r.status === 200,
    'me has data': (r) => {
      try {
        return !!JSON.parse(r.body).usuario;
      } catch {
        return false;
      }
    },
  });

  // 3. LISTA DE TAREAS
  const tasksRes = http.get(`${BASE_URL}/tasks`, { headers });
  tasksTime.add(tasksRes.timings.duration);

  const tasksOk = check(tasksRes, {
    'tasks status 200': (r) => r.status === 200,
  });

  if (!tasksOk) {
    errorRate.add(1);
  }

  // 4. VIP / NIVELES
  const levelsRes = http.get(`${BASE_URL}/levels`, { headers });
  levelsTime.add(levelsRes.timings.duration);

  check(levelsRes, {
    'levels status 200': (r) => r.status === 200,
  });

  // 5. PERFIL / GANANCIAS
  const statsRes = http.get(`${BASE_URL}/users/stats`, { headers });
  statsTime.add(statsRes.timings.duration);

  check(statsRes, {
    'stats status 200': (r) => r.status === 200,
  });

  sleep(1);
}
