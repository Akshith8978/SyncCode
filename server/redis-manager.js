/**
 * Redis Manager for Document State Caching
 * 
 * Provides high-performance document state storage and retrieval.
 * Falls back to in-memory storage if Redis is not available.
 */

import { createClient } from 'redis'

class RedisManager {
    constructor() {
        this.client = null
        this.connected = false
        this.cache = new Map() // Fallback in-memory cache
        this.init()
    }

    async init() {
        try {
            this.client = createClient({
                socket: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379,
                    connectTimeout: 5000,
                    reconnectStrategy: false // Disable retry to prevent log spam
                }
            })

            this.client.on('error', (err) => {
                // Only log if we were previously connected
                if (this.connected) {
                    console.log('Redis Error:', err.message)
                    this.connected = false
                }
            })

            this.client.on('connect', () => {
                console.log('✓ Redis connected')
                this.connected = true
            })

            await this.client.connect()
        } catch (error) {
            console.log('⚠ Redis not available - using in-memory cache fallback')
            this.connected = false
            // Clean up failed client
            if (this.client) {
                this.client.removeAllListeners()
                this.client = null
            }
        }
    }

    /**
     * Store document state
     */
    async setDocument(roomId, document) {
        const key = `room:${roomId}:document`
        const data = JSON.stringify({
            content: document,
            timestamp: Date.now()
        })

        if (this.connected && this.client) {
            try {
                await this.client.setEx(key, 3600, data) // 1 hour TTL
            } catch (error) {
                console.error('Redis set error:', error)
                this.cache.set(key, data)
            }
        } else {
            this.cache.set(key, data)
        }
    }

    /**
     * Retrieve document state
     */
    async getDocument(roomId) {
        const key = `room:${roomId}:document`

        if (this.connected && this.client) {
            try {
                const data = await this.client.get(key)
                return data ? JSON.parse(data).content : null
            } catch (error) {
                console.error('Redis get error:', error)
                const data = this.cache.get(key)
                return data ? JSON.parse(data).content : null
            }
        } else {
            const data = this.cache.get(key)
            return data ? JSON.parse(data).content : null
        }
    }

    /**
     * Store operation history
     */
    async addOperation(roomId, operation) {
        const key = `room:${roomId}:operations`

        if (this.connected && this.client) {
            try {
                await this.client.rPush(key, JSON.stringify(operation))
                await this.client.lTrim(key, -1000, -1) // Keep last 1000 operations
                await this.client.expire(key, 3600)
            } catch (error) {
                console.error('Redis operation add error:', error)
            }
        }
    }

    /**
     * Get operation history
     */
    async getOperations(roomId) {
        const key = `room:${roomId}:operations`

        if (this.connected && this.client) {
            try {
                const ops = await this.client.lRange(key, 0, -1)
                return ops.map(op => JSON.parse(op))
            } catch (error) {
                console.error('Redis operation get error:', error)
                return []
            }
        }

        return []
    }

    /**
     * Clear room data
     */
    async clearRoom(roomId) {
        const docKey = `room:${roomId}:document`
        const opsKey = `room:${roomId}:operations`

        if (this.connected && this.client) {
            try {
                await this.client.del([docKey, opsKey])
            } catch (error) {
                console.error('Redis clear error:', error)
            }
        } else {
            this.cache.delete(docKey)
            this.cache.delete(opsKey)
        }
    }

    /**
     * Get connection status
     */
    isConnected() {
        return this.connected
    }

    /**
     * Close connection
     */
    async close() {
        if (this.client && this.connected) {
            await this.client.quit()
        }
    }
}

export default RedisManager
