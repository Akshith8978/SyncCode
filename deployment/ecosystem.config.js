module.exports = {
    apps: [
        {
            name: 'synccode-server',
            script: './server/server.js',
            instances: 4, // Run 4 instances for load balancing
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            max_memory_restart: '1G',
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            watch: false,
            max_restarts: 10,
            min_uptime: '10s'
        }
    ]
}
