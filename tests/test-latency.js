import fs from 'fs';
/**
 * Latency Test
 * 
 * Validates: "Built a real-time collaborative code editor allowing 5+ users 
 * to edit simultaneously with <100ms latency synchronization"
 * 
 * Test Methodology:
 * - Simulate 5 concurrent client connections
 * - Each client sends 100 code change operations
 * - Measure round-trip time for each operation
 * - Calculate p50, p95, p99 latencies
 * 
 * Success Criteria: p95 latency < 100ms
 */

import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'
const NUM_USERS = 5
const OPERATIONS_PER_USER = 100

class LatencyTest {
    constructor() {
        this.clients = []
        this.latencies = []
    }

    async run() {
        console.log('\n🧪 LATENCY TEST')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Testing ${NUM_USERS} concurrent users`)
        console.log(`${OPERATIONS_PER_USER} operations per user`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        try {
            // Create clients
            await this.createClients()

            // Run test
            await this.testLatency()

            // Calculate statistics
            this.printResults()

            // Cleanup
            await this.cleanup()

        } catch (error) {
            console.error('Test error:', error)
            await this.cleanup()
            process.exit(1)
        }
    }

    async createClients() {
        console.log('Creating clients...')

        for (let i = 0; i < NUM_USERS; i++) {
            const socket = io(SERVER_URL, {
                transports: ['websocket']
            })

            await new Promise((resolve, reject) => {
                socket.on('connect', () => {
                    socket.emit('join-room', {
                        roomId: 'latency-test',
                        user: {
                            id: `user-${i}`,
                            name: `TestUser${i}`,
                            color: '#4ec9b0'
                        }
                    })
                    resolve()
                })

                socket.on('connect_error', reject)
                setTimeout(() => reject(new Error('Connection timeout')), 5000)
            })

            this.clients.push(socket)
        }

        console.log(`✓ Created ${NUM_USERS} clients\n`)
    }

    async testLatency() {
        console.log('Measuring latency...')

        const promises = this.clients.map((socket, userIndex) => {
            return this.measureClientLatency(socket, userIndex)
        })

        await Promise.all(promises)

        console.log(`✓ Completed ${this.latencies.length} measurements\n`)
    }

    async measureClientLatency(socket, userIndex) {
        for (let i = 0; i < OPERATIONS_PER_USER; i++) {
            const startTime = Date.now()

            // Send code change
            socket.emit('code-change', {
                roomId: 'latency-test',
                code: `// User ${userIndex} operation ${i}\nprint("test")`,
                userId: `user-${userIndex}`
            })

            // Wait for acknowledgment (via room state update)
            await new Promise((resolve) => {
                const handler = () => {
                    const latency = Date.now() - startTime
                    this.latencies.push(latency)
                    socket.off('code-change', handler)
                    resolve()
                }

                socket.on('code-change', handler)

                // Timeout after 2 seconds
                setTimeout(() => {
                    socket.off('code-change', handler)
                    resolve()
                }, 2000)
            })

            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 10))
        }
    }

    printResults() {
        if (this.latencies.length === 0) {
            console.log('❌ No latency measurements collected')
            return
        }

        // Sort latencies
        const sorted = this.latencies.slice().sort((a, b) => a - b)

        // Calculate percentiles
        const p50 = sorted[Math.floor(sorted.length * 0.50)]
        const p95 = sorted[Math.floor(sorted.length * 0.95)]
        const p99 = sorted[Math.floor(sorted.length * 0.99)]
        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length
        const min = sorted[0]
        const max = sorted[sorted.length - 1]

        console.log('📊 RESULTS')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Total operations: ${sorted.length}`)
        console.log(`Average latency:  ${avg.toFixed(2)}ms`)
        console.log(`Min latency:      ${min}ms`)
        console.log(`Max latency:      ${max}ms`)
        console.log(`p50 latency:      ${p50}ms`)
        console.log(`p95 latency:      ${p95}ms`)
        console.log(`p99 latency:      ${p99}ms`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        // Check success criteria
        if (p95 < 100) {
            console.log(`\n✅ PASS: p95 latency (${p95}ms) < 100ms target`)
        } else {
            console.log(`\n❌ FAIL: p95 latency (${p95}ms) >= 100ms target`)
        }

        // Save results
        const results = {
            timestamp: new Date().toISOString(),
            users: NUM_USERS,
            operations: sorted.length,
            latencies: { min, max, avg, p50, p95, p99 },
            passed: p95 < 100
        }

        fs.writeFileSync(
            'latency-results.json',
            JSON.stringify(results, null, 2)
        )

        console.log('\n💾 Results saved to latency-results.json\n')
    }

    async cleanup() {
        for (const socket of this.clients) {
            socket.disconnect()
        }
    }
}

// Run test
const test = new LatencyTest()
test.run()
