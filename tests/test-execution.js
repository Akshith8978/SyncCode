import fs from 'fs';
/**
 * Code Execution Performance Test
 * 
 * Validates: "Integrated a sandboxed execution engine using Docker to securely 
 * compile and run C++ and Python snippets in under 2 seconds"
 * 
 * Test Methodology:
 * - Execute 25 Python scripts and 25 C++ programs
 * - Measure time from request to output received
 * - Calculate average execution time
 * 
 * Success Criteria: Average execution time < 2 seconds
 */

import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3001'
const NUM_TESTS = 25

const PYTHON_SAMPLES = [
    'print("Hello World")',
    'for i in range(10):\n    print(i)',
    'x = [i**2 for i in range(100)]\nprint(sum(x))',
    'def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\nprint(fib(10))',
    'import math\nprint(math.sqrt(16))'
]

const CPP_SAMPLES = [
    '#include <iostream>\nusing namespace std;\nint main() { cout << "Hello World" << endl; return 0; }',
    '#include <iostream>\nusing namespace std;\nint main() { for(int i=0; i<10; i++) cout << i << endl; return 0; }',
    '#include <iostream>\nusing namespace std;\nint main() { int sum = 0; for(int i=0; i<100; i++) sum += i*i; cout << sum << endl; return 0; }',
    '#include <iostream>\nusing namespace std;\nint fib(int n) { if(n<=1) return n; return fib(n-1)+fib(n-2); }\nint main() { cout << fib(10) << endl; return 0; }',
    '#include <iostream>\n#include <cmath>\nusing namespace std;\nint main() { cout << sqrt(16) << endl; return 0; }'
]

class ExecutionTest {
    constructor() {
        this.socket = null
        this.executionTimes = []
    }

    async run() {
        console.log('\n🧪 CODE EXECUTION PERFORMANCE TEST')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Testing ${NUM_TESTS} Python executions`)
        console.log(`Testing ${NUM_TESTS} C++ executions`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        try {
            await this.connect()

            // Test Python
            await this.testLanguage('python', PYTHON_SAMPLES, NUM_TESTS)

            // Test C++
            await this.testLanguage('cpp', CPP_SAMPLES, NUM_TESTS)

            // Print results
            this.printResults()

            this.cleanup()

        } catch (error) {
            console.error('❌ Test error:', error)
            this.cleanup()
            process.exit(1)
        }
    }

    async connect() {
        console.log('Connecting to server...')

        this.socket = io(SERVER_URL, {
            transports: ['websocket']
        })

        await new Promise((resolve, reject) => {
            this.socket.on('connect', resolve)
            this.socket.on('connect_error', reject)
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
        })

        console.log('✓ Connected\n')
    }

    async testLanguage(language, samples, count) {
        console.log(`Testing ${language.toUpperCase()}...`)

        for (let i = 0; i < count; i++) {
            const code = samples[i % samples.length]
            const startTime = Date.now()

            try {
                await this.executeCode(language, code)
                const executionTime = Date.now() - startTime
                this.executionTimes.push({
                    language,
                    time: executionTime,
                    index: i
                })

                process.stdout.write('.')
            } catch (error) {
                console.error(`\n❌ Execution ${i} failed:`, error.message)
            }
        }

        console.log(` ✓ ${count} tests completed\n`)
    }

    async executeCode(language, code) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Execution timeout'))
            }, 35000)

            this.socket.emit('execute-code', { language, code })

            const resultHandler = (result) => {
                clearTimeout(timeout)
                this.socket.off('execution-result', resultHandler)
                this.socket.off('execution-error', errorHandler)
                resolve(result)
            }

            const errorHandler = (error) => {
                clearTimeout(timeout)
                this.socket.off('execution-result', resultHandler)
                this.socket.off('execution-error', errorHandler)
                reject(error)
            }

            this.socket.once('execution-result', resultHandler)
            this.socket.once('execution-error', errorHandler)
        })
    }

    printResults() {
        if (this.executionTimes.length === 0) {
            console.log('❌ No execution times recorded')
            return
        }

        const pythonTimes = this.executionTimes
            .filter(t => t.language === 'python')
            .map(t => t.time)

        const cppTimes = this.executionTimes
            .filter(t => t.language === 'cpp')
            .map(t => t.time)

        const allTimes = this.executionTimes.map(t => t.time)

        const avgPython = pythonTimes.reduce((a, b) => a + b, 0) / pythonTimes.length
        const avgCpp = cppTimes.reduce((a, b) => a + b, 0) / cppTimes.length
        const avgAll = allTimes.reduce((a, b) => a + b, 0) / allTimes.length

        const minAll = Math.min(...allTimes)
        const maxAll = Math.max(...allTimes)

        console.log('📊 RESULTS')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`Total executions:     ${this.executionTimes.length}`)
        console.log(`Python avg:           ${avgPython.toFixed(0)}ms (${(avgPython / 1000).toFixed(2)}s)`)
        console.log(`C++ avg:              ${avgCpp.toFixed(0)}ms (${(avgCpp / 1000).toFixed(2)}s)`)
        console.log(`Overall avg:          ${avgAll.toFixed(0)}ms (${(avgAll / 1000).toFixed(2)}s)`)
        console.log(`Min:                  ${minAll}ms`)
        console.log(`Max:                  ${maxAll}ms`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        const avgSeconds = avgAll / 1000
        if (avgSeconds < 2) {
            console.log(`\n✅ PASS: Average execution time (${avgSeconds.toFixed(2)}s) < 2s target`)
        } else {
            console.log(`\n❌ FAIL: Average execution time (${avgSeconds.toFixed(2)}s) >= 2s target`)
        }

        // Save results
        const results = {
            timestamp: new Date().toISOString(),
            totalExecutions: this.executionTimes.length,
            averages: {
                python: avgPython,
                cpp: avgCpp,
                overall: avgAll,
                overallSeconds: avgSeconds
            },
            min: minAll,
            max: maxAll,
            passed: avgSeconds < 2
        }

        fs.writeFileSync(
            'execution-results.json',
            JSON.stringify(results, null, 2)
        )

        console.log('\n💾 Results saved to execution-results.json\n')
    }

    cleanup() {
        if (this.socket) {
            this.socket.disconnect()
        }
    }
}

// Run test
const test = new ExecutionTest()
test.run()
