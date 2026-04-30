const run = async () => {
  const url = 'http://173.249.55.143/api/auth/login';
  const body = {
    telefono: '70000001',
    password: '14738941lp',
    deviceId: 'node-local-test'
  };

  console.log('Enviando petición a:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', data);
};

run().catch(console.error);
