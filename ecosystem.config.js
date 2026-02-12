module.exports = {
  apps: [{
    name: 'askeuno',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    // Auto restart if memory exceeds 1GB
    max_memory_restart: '1G',
    // Wait 3 seconds before restarting
    restart_delay: 3000,
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100,
    // Watch for file changes (disable in production)
    watch: false,
    // Ignore watch for these paths
    ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};