import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import OTEngine from './ot-engine.js'
import RedisManager from './redis-manager.js'
import ExecutionEngine from './execution-engine.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Initialize services
const otEngine = new OTEngine()
const redisManager = new RedisManager()
const executionEngine = new ExecutionEngine()

// In-memory storage (fallback if Redis not available)
const rooms = new Map()

// Helper to get or create room
function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            document: '# Write your Python code here\nprint("Hello, SyncCode!")\n',
            version: 0,
            users: [],
            operations: []
        })
    }
    return rooms.get(roomId)
}

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Join room
    socket.on('join-room', async ({ roomId, user }) => {
        socket.join(roomId)
        console.log(`User ${user.name} joined room ${roomId}`)

        const room = getRoom(roomId)

        // Add user to room
        room.users.push({
            ...user,
            socketId: socket.id
        })

        // Send current state to new user
        socket.emit('room-state', {
            document: room.document,
            version: room.version,
            users: room.users
        })

        // Notify others
        socket.to(roomId).emit('users-update', room.users)
    })

    // Handle code changes
    socket.on('code-change', ({ roomId, code, userId }) => {
        const room = getRoom(roomId)

        // Update document
        room.document = code
        room.version++

        // Broadcast to all other clients in the room
        socket.to(roomId).emit('code-change', {
            code,
            version: room.version,
            userId
        })

        console.log(`Code updated in room ${roomId}, version ${room.version}`)
    })

    // Handle code execution
    socket.on('execute-code', async ({ language, code }) => {
        console.log(`Executing ${language} code...`)

        try {
            const startTime = Date.now()
            const result = await executionEngine.execute(language, code)
            const executionTime = Date.now() - startTime

            console.log(`Execution completed in ${executionTime}ms`)

            socket.emit('execution-result', {
                ...result,
                executionTime
            })
        } catch (error) {
            console.error('Execution error:', error)
            socket.emit('execution-error', {
                message: error.message
            })
        }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`)

        // Remove user from all rooms
        rooms.forEach((room, roomId) => {
            const initialLength = room.users.length
            room.users = room.users.filter(u => u.socketId !== socket.id)

            if (room.users.length < initialLength) {
                io.to(roomId).emit('users-update', room.users)
            }
        })
    })
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeRooms: rooms.size
    })
})

// Start server
httpServer.listen(PORT, () => {
    console.log(`
  ⚡ SyncCode Server Running
  ━━━━━━━━━━━━━━━━━━━━━━━━━━
  Port:    ${PORT}
  Health:  http://localhost:${PORT}/health
  Status:  Ready for connections
  ━━━━━━━━━━━━━━━━━━━━━━━━━━
  `)
})

export default app
