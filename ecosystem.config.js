module.exports = {
  apps: [
    {
      name: 'pet-adoption-backend',
      script: './backend/server.js',
      cwd: '/home/Theo/Pet-Adoption-on-Web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'pet-adoption-frontend',
      script: 'http-server',
      args: '-p 8080 -c-1 --cors',
      cwd: '/home/Theo/Pet-Adoption-on-Web/frontend',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};