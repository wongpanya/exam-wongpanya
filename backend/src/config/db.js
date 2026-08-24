const dns = require('node:dns');
const mongoose = require('mongoose');

const connectOptions = {
    maxPoolSize: 10, // Optimized for 1GB RAM ($10 plan)
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

const isSrvDnsError = (error) => {
    const message = String(error?.message || '');
    return ['querySrv', 'EBADRESP', 'ENOTFOUND'].some((part) =>
        message.includes(part)
    );
};

const usePublicDnsResolvers = () => {
    // Atlas SRV lookups can fail with EBADRESP on some local resolvers.
    // Only switch resolvers after the normal lookup fails so environments
    // that require an internal DNS server continue to work normally.
    try {
        const servers = String(process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
            .split(',')
            .map((server) => server.trim())
            .filter(Boolean);
        dns.setServers(servers);
        console.warn('⚠️ MongoDB SRV lookup failed; retrying with public DNS resolvers...');
    } catch (error) {
        console.warn(`Could not configure public DNS resolvers: ${error.message}`);
    }
};

const queryDnsOverHttps = async (name, type) => {
    const providers = [
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
        `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    ];

    let lastError;
    for (const endpoint of providers) {
        try {
            const response = await fetch(endpoint, {
                headers: { accept: 'application/dns-json' },
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            if (result.Status !== 0 && result.Status !== 3) {
                throw new Error(`DNS status ${result.Status}`);
            }
            return Array.isArray(result.Answer) ? result.Answer : [];
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`DNS-over-HTTPS lookup failed: ${lastError?.message || 'unknown error'}`);
};

const buildDirectMongoUri = async (srvUri) => {
    const parsed = new URL(srvUri);
    if (parsed.protocol !== 'mongodb+srv:') return null;

    const srvAnswers = await queryDnsOverHttps(`_mongodb._tcp.${parsed.hostname}`, 'SRV');
    const hosts = srvAnswers
        .map((answer) => {
            const parts = String(answer.data || '').split(/\s+/);
            const port = parts[2];
            const hostname = parts[3];
            if (!hostname || !port || !/^\d+$/.test(port)) return null;
            return `${hostname.replace(/\.$/, '')}:${port}`;
        })
        .filter(Boolean);

    if (!hosts.length) throw new Error('No Atlas shard hosts were returned by SRV lookup');

    const queryParams = new URLSearchParams(parsed.search);
    const txtAnswers = await queryDnsOverHttps(parsed.hostname, 'TXT').catch(() => []);
    for (const answer of txtAnswers) {
        const txt = String(answer.data || '').replace(/^"|"$/g, '');
        for (const [key, value] of new URLSearchParams(txt)) {
            if (!queryParams.has(key)) queryParams.set(key, value);
        }
    }

    queryParams.set('tls', 'true');
    if (!queryParams.has('authSource')) queryParams.set('authSource', 'admin');
    if (!queryParams.has('retryWrites')) queryParams.set('retryWrites', 'true');
    if (!queryParams.has('w')) queryParams.set('w', 'majority');

    const credentials = parsed.username
        ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
        : '';
    const path = parsed.pathname || '/';
    const query = queryParams.toString();
    return `mongodb://${credentials}${hosts.join(',')}${path}${query ? `?${query}` : ''}`;
};

const connectDB = async () => {
    const connect = () => mongoose.connect(process.env.MONGODB_URL, connectOptions);

    try {
        const conn = await connect();
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        if (isSrvDnsError(error)) {
            usePublicDnsResolvers();
            await mongoose.disconnect().catch(() => {});

            try {
                const conn = await connect();
                console.log(`MongoDB Connected: ${conn.connection.host}`);
                return;
            } catch (retryError) {
                console.warn(`Public DNS retry failed (${retryError.message}); resolving Atlas via DNS-over-HTTPS...`);

                try {
                    const directUri = await buildDirectMongoUri(process.env.MONGODB_URL);
                    await mongoose.disconnect().catch(() => {});
                    const conn = await mongoose.connect(directUri, connectOptions);
                    console.log(`MongoDB Connected (via DNS-over-HTTPS fallback): ${conn.connection.host}`);
                    return;
                } catch (fallbackError) {
                    console.error(`MongoDB DNS-over-HTTPS fallback failed: ${fallbackError.message}`);
                }
            }
        } else {
            console.error(`MongoDB connection error: ${error.message}`);
        }

        process.exit(1);
    }
};

mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

module.exports = connectDB;
