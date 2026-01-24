"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.testConnectionWithRetry = testConnectionWithRetry;
const pg_1 = require("pg");
// Database connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const isNeonHost = process.env.DB_HOST?.includes('neon.tech') || false;
const pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mini_jira',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: isNeonHost
        ? {
            rejectUnauthorized: false, // For Neon free tier
            servername: process.env.DB_SSL_SERVERNAME || process.env.DB_HOST,
        }
        : false,
    // Optimized Connection Pool Settings for Neon cloud PostgreSQL
    max: parseInt(process.env.DB_POOL_MAX || '12'), // Reduced from 40 to prevent connection exhaustion
    min: parseInt(process.env.DB_POOL_MIN || '2'), // Reduced minimum connections
    connectionTimeoutMillis: 10000, // Reduced from 30000 to 10s for faster error detection
    idleTimeoutMillis: isNeonHost ? 300000 : 600000, // 5min for Neon, 10min for local
    query_timeout: 45000, // Reduced from 60s to 45s
    statement_timeout: 45000, // Reduced from 60s to 45s
    // Performance tuning for cloud environments
    allowExitOnIdle: false,
    keepAlive: true,
    keepAliveInitialDelayMillis: isNeonHost ? 10000 : 60000,
});
// Enhanced error types for better handling
const isConnectionError = (error) => {
    const connectionErrors = [
        'Connection terminated unexpectedly',
        'connect ECONNREFUSED',
        'connect ETIMEDOUT',
        'getaddrinfo ENOTFOUND',
        'admin_shutdown',
        'cannot_connect_now',
    ];
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    return (connectionErrors.some(msg => errorMessage.includes(msg)) ||
        ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '08003', '08006'].includes(errorCode));
};
// Connection retry with exponential backoff
async function retryQuery(queryFn, retries = MAX_RETRIES) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await queryFn();
        }
        catch (error) {
            lastError = error;
            if (attempt === retries) {
                break; // No more retries
            }
            // Only retry on connection errors
            if (!isConnectionError(error)) {
                break;
            }
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
            console.warn(`🔄 Database query failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
            console.warn(`Error: ${error}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
// Pool error handling with enhanced logging
pool.on('error', (err, client) => {
    console.error('❌ Unexpected database pool error:', err);
    console.error('Error details:', {
        message: err.message,
        code: err?.code,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'), // First 3 stack lines
        poolStats: {
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
        },
    });
    // Attempt to refresh connection if it's a connection error
    if (isConnectionError(err)) {
        console.log('🔄 Connection error detected, pool will attempt to recover');
    }
});
pool.on('connect', client => {
    console.log(`✅ New database connection established (Total: ${pool.totalCount})`);
});
pool.on('remove', client => {
    console.log(`🔌 Database connection removed from pool (Total: ${pool.totalCount})`);
});
// Enhanced connection test with retry
async function testConnectionWithRetry() {
    try {
        await retryQuery(async () => {
            const result = await pool.query('SELECT NOW() as now, version() as version');
            console.log('✅ Database connected successfully at:', result.rows[0].now);
            console.log(`📊 Pool configured: max=${pool.options.max}, min=${pool.options.min}`);
            console.log(`🔗 Database: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        });
    }
    catch (err) {
        console.error('❌ Database connection test failed after retries:', err.message);
        console.error('Please check your database configuration and network connectivity');
    }
}
// Test connection on startup - DISABLED auto-run for Vercel/Serverless support
// testConnectionWithRetry()
// Enhanced db object with retry logic
exports.db = {
    query: async (text, params) => {
        return await retryQuery(async () => {
            const result = await pool.query(text, params);
            return result;
        });
    },
    // Health check method
    healthCheck: async () => {
        try {
            const start = Date.now();
            const result = await pool.query('SELECT NOW() as now, current_database() as database');
            const responseTime = Date.now() - start;
            return {
                healthy: true,
                details: {
                    timestamp: result.rows[0].now,
                    database: result.rows[0].database,
                    responseTimeMs: responseTime,
                    poolStats: {
                        totalCount: pool.totalCount,
                        idleCount: pool.idleCount,
                        waitingCount: pool.waitingCount,
                        maxConnections: pool.options.max,
                        minConnections: pool.options.min,
                    },
                },
            };
        }
        catch (error) {
            return {
                healthy: false,
                details: {
                    error: error.message,
                    errorCode: error.code,
                    poolStats: {
                        totalCount: pool.totalCount,
                        idleCount: pool.idleCount,
                        waitingCount: pool.waitingCount,
                        maxConnections: pool.options.max,
                        minConnections: pool.options.min,
                    },
                },
            };
        }
    },
};
exports.default = pool;
