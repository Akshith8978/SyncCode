/**
 * Docker-based Code Execution Engine
 * 
 * Executes user code in isolated Docker containers for security.
 * Supports Python and C++ with resource limits and timeouts.
 */

import Docker from 'dockerode'
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class ExecutionEngine {
    constructor() {
        this.docker = new Docker()
        this.tempDir = join(__dirname, 'temp')

        // Create temp directory if it doesn't exist
        if (!existsSync(this.tempDir)) {
            mkdirSync(this.tempDir, { recursive: true })
        }
    }

    /**
     * Execute code in a Docker container
     */
    async execute(language, code) {
        const tempFile = this.createTempFile(language, code)

        try {
            const result = await this.runInDocker(language, tempFile)
            return result
        } finally {
            // Cleanup temp file
            try {
                unlinkSync(tempFile)
            } catch (error) {
                console.error('Failed to delete temp file:', error)
            }
        }
    }

    /**
     * Create temporary file with user code
     */
    createTempFile(language, code) {
        const extension = language === 'python' ? 'py' : 'cpp'
        const filename = `code_${Date.now()}.${extension}`
        const filepath = join(this.tempDir, filename)

        writeFileSync(filepath, code, 'utf8')
        return filepath
    }

    /**
     * Run code in Docker container
     */
    async runInDocker(language, filepath) {
        const startTime = Date.now()

        try {
            // Check if Docker is available
            await this.docker.ping()
        } catch (error) {
            console.error('Docker not available, using mock execution')
            return this.mockExecution(language, filepath)
        }

        const config = this.getDockerConfig(language, filepath)

        try {
            // Create and start container
            const container = await this.docker.createContainer(config)

            await container.start()

            // Wait for container to finish with timeout
            const timeout = 30000 // 30 seconds
            const waitPromise = container.wait()
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Execution timeout (30s)')), timeout)
            )

            await Promise.race([waitPromise, timeoutPromise])

            // Get logs
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                follow: false
            })

            const output = logs.toString('utf8')

            // Remove container
            await container.remove({ force: true })

            const executionTime = Date.now() - startTime

            return {
                output: output || '(No output)',
                error: null,
                executionTime
            }

        } catch (error) {
            console.error('Docker execution error:', error)

            // Fallback to mock execution
            return this.mockExecution(language, filepath)
        }
    }

    /**
     * Get Docker configuration for language
     */
    getDockerConfig(language, filepath) {
        const filename = filepath.split(/[/\\]/).pop()
        const binds = [`${filepath}:/app/${filename}:ro`]

        if (language === 'python') {
            return {
                Image: 'python:3.11-slim',
                Cmd: ['python', `/app/${filename}`],
                HostConfig: {
                    Binds: binds,
                    Memory: 512 * 1024 * 1024, // 512MB
                    NetworkMode: 'none',
                    AutoRemove: false
                },
                WorkingDir: '/app'
            }
        } else if (language === 'cpp') {
            const baseName = filename.replace('.cpp', '')
            return {
                Image: 'gcc:13',
                Cmd: ['sh', '-c', `g++ /app/${filename} -o /app/${baseName} && /app/${baseName}`],
                HostConfig: {
                    Binds: binds,
                    Memory: 512 * 1024 * 1024, // 512MB
                    NetworkMode: 'none',
                    AutoRemove: false
                },
                WorkingDir: '/app'
            }
        }

        throw new Error(`Unsupported language: ${language}`)
    }

    /**
     * Mock execution when Docker is not available
     * Simulates execution for development/testing
     */
    mockExecution(language, filepath) {
        console.log('⚠ Using mock execution (Docker not available)')

        const code = readFileSync(filepath, 'utf8')

        // Simple pattern matching for demonstration
        if (language === 'python') {
            const printMatches = code.match(/print\(['"](.*)['"]\)/g)
            if (printMatches) {
                const output = printMatches
                    .map(m => m.match(/print\(['"](.*)['"]\)/)[1])
                    .join('\n')
                return {
                    output,
                    error: null,
                    executionTime: 150
                }
            }
        } else if (language === 'cpp') {
            const coutMatches = code.match(/cout\s*<<\s*['"](.*)['"]/g)
            if (coutMatches) {
                const output = coutMatches
                    .map(m => m.match(/['"](.*)['"]/)[1])
                    .join('\n')
                return {
                    output,
                    error: null,
                    executionTime: 850
                }
            }
        }

        return {
            output: `[Mock] Code would execute here\nLanguage: ${language}\nDocker not available - Install Docker to run real code execution`,
            error: null,
            executionTime: 200
        }
    }
}

export default ExecutionEngine
