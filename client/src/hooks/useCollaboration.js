import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

// Connect to origin, which Vite proxy will forward to backend Server 
const SERVER_URL = ''

// Generate random user color
const generateColor = () => {
    const colors = ['#4ec9b0', '#c586c0', '#ce9178', '#dcdcaa', '#569cd6', '#4fc1ff']
    return colors[Math.floor(Math.random() * colors.length)]
}

// Generate random user name
const generateUserName = () => {
    const adjectives = ['Quick', 'Happy', 'Clever', 'Bright', 'Swift']
    const nouns = ['Coder', 'Dev', 'Hacker', 'Builder', 'Ninja']
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`
}

export default function useCollaboration(initialCode) {
    const [code, setCode] = useState(initialCode)
    const [users, setUsers] = useState([])
    const [isConnected, setIsConnected] = useState(false)
    const socketRef = useRef(null)
    const userInfoRef = useRef({
        id: `user-${Date.now()}`,
        name: generateUserName(),
        color: generateColor()
    })

    useEffect(() => {
        // Initialize Socket.io connection
        const socket = io(SERVER_URL, {
            transports: ['websocket', 'polling']
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Connected to server')
            setIsConnected(true)

            // Join default room and send user info
            socket.emit('join-room', {
                roomId: 'default',
                user: userInfoRef.current
            })
        })

        socket.on('disconnect', () => {
            console.log('Disconnected from server')
            setIsConnected(false)
        })

        // Handle room state updates
        socket.on('room-state', (state) => {
            console.log('Received room state:', state)
            setCode(state.document)
            setUsers(state.users)
        })

        // Handle remote code changes
        socket.on('code-change', (change) => {
            console.log('Remote code change:', change)
            setCode(change.code)
        })

        // Handle user updates
        socket.on('users-update', (updatedUsers) => {
            console.log('Users update:', updatedUsers)
            setUsers(updatedUsers)
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    const handleEditorChange = (value) => {
        if (!value && value !== '') return

        setCode(value)

        // Send change to server
        if (socketRef.current && isConnected) {
            socketRef.current.emit('code-change', {
                roomId: 'default',
                code: value,
                userId: userInfoRef.current.id
            })
        }
    }

    const executeCode = async (language, code) => {
        if (!socketRef.current || !isConnected) {
            throw new Error('Not connected to server')
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Execution timeout'))
            }, 35000) // 35 second timeout

            socketRef.current.emit('execute-code', {
                language,
                code
            })

            socketRef.current.once('execution-result', (result) => {
                clearTimeout(timeout)
                resolve(result)
            })

            socketRef.current.once('execution-error', (error) => {
                clearTimeout(timeout)
                reject(new Error(error.message))
            })
        })
    }

    return {
        code,
        setCode,
        users,
        isConnected,
        handleEditorChange,
        executeCode
    }
}
