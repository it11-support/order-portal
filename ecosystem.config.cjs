module.exports = {
  apps: [
    {
      name: 'order-portal-backend',
      cwd: '/home/order-portal/apps/backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'order-portal-frontend',
      cwd: '/home/order-portal/apps/frontend',
      script: '/root/.local/share/pnpm/bin/pnpm',
      args: 'start',
      interpreter: '/bin/bash',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5173,
        PATH: process.env.PATH,
      },
    }
  ],
}