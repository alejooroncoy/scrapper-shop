module.exports = {
  apps: [
    {
      name: 'fortnite-scraper',
      script: 'bun',
      args: '--hot server.ts',
      cwd: '/Users/USER/Desktop/Projects/freelancer/web-scrapping',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3009
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      wait_ready: true,
      // Configuración específica para el scraper
      exec_mode: 'fork',
      node_args: '--max-old-space-size=1024',
      // Variables de entorno adicionales
      env_production: {
        NODE_ENV: 'production',
        PORT: 3009,
        SCRAPER_TIMEOUT: '120000',
        SCRAPER_RETRIES: '5',
        SCRAPER_DELAY: '3000'
      }
    }
  ],

  deploy: {
    production: {
      user: 'USER',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:usuario/fortnite-scraper.git',
      path: '/Users/USER/Desktop/Projects/freelancer/web-scrapping',
      'pre-deploy-local': '',
      'post-deploy': 'bun install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
