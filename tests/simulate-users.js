/**
 * User Simulation Script
 * 
 * Simulates multiple users joining the 'default' room to demonstrate
 * real-time collaboration user presence.
 */

import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'
const NUM_USERS = 25 // Add 25 users
const DURATION = 300000 // Run for 5 minutes

class UserSimulation {
    constructor() {
        this.clients = []
    }

    async run() {
        console.log('\n👥 STARTING USER SIMULATION')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Adding ${NUM_USERS} users to the 'default' room...`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        try {
            await this.createClients()
            console.log(`\n✅ ${NUM_USERS} users added! Check your browser tab.`)
            console.log(`Keeping them active for ${DURATION / 1000} seconds...`)
            console.log('(Press Ctrl+C to stop manually)')

            // Keep alive
            await new Promise(resolve => setTimeout(resolve, DURATION))

            await this.cleanup()

        } catch (error) {
            console.error('Simulation error:', error)
            await this.cleanup()
        }
    }

    async createClients() {
        for (let i = 0; i < NUM_USERS; i++) {
            const socket = io(SERVER_URL, {
                transports: ['websocket'],
                reconnection: true
            })

            // Wait for connection
            await new Promise((resolve) => {
                socket.on('connect', () => {
                    // Join default room
                    socket.emit('join-room', {
                        roomId: 'default',
                        user: {
                            id: `sim-user-${i}`,
                            name: `Bot ${i + 1}`,
                            color: this.getRandomColor()
                        }
                    })
                    resolve()
                })
            })

            this.clients.push(socket)

            // Stagger connections slightly
            await new Promise(resolve => setTimeout(resolve, 100))
            process.stdout.write('.')
        }
    }

    getRandomColor() {
        const colors = ['#4ec9b0', '#c586c0', '#ce9178', '#dcdcaa', '#569cd6', '#4fc1ff']
        return colors[Math.floor(Math.random() * colors.length)]
    }

    async cleanup() {
        console.log('\nCleaning up...')
        for (const socket of this.clients) {
            socket.disconnect()
        }
    }
}

const sim = new UserSimulation()
sim.run()
