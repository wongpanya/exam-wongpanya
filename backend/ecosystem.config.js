module.exports = {
    apps: [{
        name: 'anti-cheat-exam-api',
        script: 'src/server.js',
        instances: 1,          // 1 vCPU = 1 instance
        exec_mode: 'fork',
        max_memory_restart: '800M', // Increased for 1GB RAM plan
        env: {
            NODE_ENV: 'production',
        },
        env_development: {
            NODE_ENV: 'development',
        },
    }],
};
