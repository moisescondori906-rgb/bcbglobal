module.exports = {
  apps: [
    {
      name: 'bcb-global-backend',
      script: 'src/index.mjs',
      cwd: '/var/www/bcb_global/backend',
      instances: 'max', // Usar todos los núcleos disponibles
      exec_mode: 'cluster', // Habilitar modo Cluster para alta concurrencia
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        NODE_OPTIONS: '--max-old-space-size=2048'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      max_memory_restart: '1.5G',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      wait_ready: true,
      listen_timeout: 15000,
      kill_timeout: 10000,
      exp_backoff_restart_delay: 500,
      max_restarts: 10,
      min_uptime: '30s',
      combine_logs: true,
      instance_var: 'INSTANCE_ID',
      shutdown_with_message: true,
      post_update: ['npm install --production', 'echo "App updated"']
    }
  ]
};
