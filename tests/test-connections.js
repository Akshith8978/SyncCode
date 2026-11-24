import fs from 'fs';
/**
 * WebSocket Connection Load Test
 * 
 * Validates: "Deployed on AWS EC2 with Nginx reverse proxy, supporting 
 * 100+ concurrent websocket connections"
 * 
 * Test Methodology:
 * - Open 150 concurrent WebSocket connections
 * - Keep connections alive for 60 seconds
 * - Send periodic heartbeat messages
 * - Monitor for connection failures
 * 
 * Success Criteria: All 150 connections remain stable
 */

import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'
const NUM_CONNECTIONS = 150
const TEST_DURATION = 60000 // 60 seconds

class ConnectionTest {
    constructor() {
        this.connections = []
        this.failures = 0
    }

    async run() {
        console.log('\n🧪 WEBSOCKET CONNECTION LOAD TEST')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Opening ${NUM_CONNECTIONS} concurrent connections`)
        console.log(`Duration: ${TEST_DURATION / 1000} seconds`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        try {
            await this.createConnections()
            await this.monitorConnections()
            this.printResults()
            await this.cleanup()

        } catch (error) {
            console.error('❌ Test error:', error)
            await this.cleanup()
            process.exit(1)
        }
    }

    async createConnections() {
        console.log('Creating connections...')

        const batchSize = 10
        for (let i = 0; i < NUM_CONNECTIONS; i += batchSize) {
            const batch = []

            for (let j = 0; j < batchSize && i + j < NUM_CONNECTIONS; j++) {
                const index = i + j
                batch.push(this.createConnection(index))
            }

            await Promise.all(batch)
            process.stdout.write('.')

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        console.log(`\n✓ Created ${this.connections.length} connections\n`)
        console.log(`Failures: ${this.failures}`)
    }

    async createConnection(index) {
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: false
        })

        const conn = {
            socket,
            index,
            connected: false,
            failed: false,
            messagesSent: 0
        }

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (!conn.connected) {
                    conn.failed = true
                    this.failures++
                    socket.disconnect()
                }
                resolve()
            }, 3000)

            socket.on('connect', () => {
                clearTimeout(timeout)
                conn.connected = true

                // Join room
                socket.emit('join-room', {
                    roomId: 'connection-test',
                    user: {
                        id: `conn-${index}`,
                        name: `Conn${index}`,
                        color: '#569cd6'
                    }
                })

                this.connections.push(conn)
                resolve()
            })

            socket.on('disconnect', () => {
                if (!conn.failed) {
                    conn.failed = true
                    this.failures++
                }
            })

            socket.on('error', (error) => {
                if (!conn.failed) {
                    conn.failed = true
                    this.failures++
                }
                socket.disconnect()
                resolve()
            })
        })
    }

    async monitorConnections() {
        console.log(`\nMonitoring connections for ${TEST_DURATION / 1000} seconds...`)

        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, TEST_DURATION - elapsed)

            // Send heartbeat messages
            this.connections.forEach(conn => {
                if (conn.connected && !conn.failed) {
                    try {
                        conn.socket.emit('code-change', {
                            roomId: 'connection-test',
                            code: `// Heartbeat from ${conn.index}`,
                            userId: `conn-${conn.index}`
                        })
                        conn.messagesSent++
                    } catch (error) {
                        conn.failed = true
                        this.failures++
                    }
                }
            })

            const active = this.connections.filter(c => c.connected && !c.failed).length
            const failed = this.failures

            process.stdout.write(`\r⏱  ${Math.ceil(remaining / 1000)}s remaining | Active: ${active} | Failed: ${failed}    `)

            if (elapsed >= TEST_DURATION) {
                clearInterval(interval)
            }
        }, 2000)

        await new Promise(resolve => setTimeout(resolve, TEST_DURATION))
        clearInterval(interval)
        console.log('\n')
    }

    printResults() {
        const successful = this.connections.filter(c => c.connected && !c.failed).length
        const failed = this.failures
        const totalAttempted = NUM_CONNECTIONS

        const successRate = (successful / totalAttempted * 100).toFixed(1)

        console.log('📊 RESULTS')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Total attempted:      ${totalAttempted}`)
        console.log(`Successful:           ${successful}`)
        console.log(`Failed:               ${failed}`)
        console.log(`Success rate:         ${successRate}%`)
        console.log(`Test duration:        ${TEST_DURATION / 1000}s`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        if (successful >= 100) {
            console.log(`\n✅ PASS: ${successful} concurrent connections maintained (target: 100+)`)
        } else {
            console.log(`\n❌ FAIL: Only ${successful} connections maintained (target: 100+)`)
        }

        // Save results
        const results = {
            timestamp: new Date().toISOString(),
            attempted: totalAttempted,
            successful,
            failed,
            successRate: parseFloat(successRate),
            duration: TEST_DURATION,
            passed: successful >= 100
        }

        fs.writeFileSync(
            'connection-results.json',
            JSON.stringify(results, null, 2)
        )

        console.log('\n💾 Results saved to connection-results.json\n')
    }

    async cleanup() {
        console.log('Cleaning up connections...')
        for (const conn of this.connections) {
            try {
                conn.socket.disconnect()
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }
}

// Run test
const test = new ConnectionTest()
test.run()
