import { useState } from 'react'
import Editor from '@monaco-editor/react'
import useCollaboration from './hooks/useCollaboration'

const LANGUAGES = [
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' }
]

const DEFAULT_CODE = {
    python: '# Write your Python code here\nprint("Hello, SyncCode!")\n',
    cpp: '// Write your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, SyncCode!" << endl;\n    return 0;\n}\n'
}

function App() {
    const [language, setLanguage] = useState('python')
    const [output, setOutput] = useState('')
    const [isExecuting, setIsExecuting] = useState(false)

    const {
        code,
        setCode,
        users,
        isConnected,
        handleEditorChange,
        executeCode
    } = useCollaboration(DEFAULT_CODE[language])

    const handleLanguageChange = (e) => {
        const newLang = e.target.value
        setLanguage(newLang)
        setCode(DEFAULT_CODE[newLang])
        setOutput('')
    }

    const handleRunCode = async () => {
        setIsExecuting(true)
        setOutput('Executing...')

        try {
            const result = await executeCode(language, code)
            setOutput(result.output || result.error || 'No output')
        } catch (error) {
            setOutput(`Error: ${error.message}`)
        } finally {
            setIsExecuting(false)
        }
    }

    return (
        <div className="app">
            <header className="header">
                <h1>⚡ SyncCode</h1>
                <div className="header-controls">
                    <select
                        className="language-select"
                        value={language}
                        onChange={handleLanguageChange}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>

                    <button
                        className="run-button"
                        onClick={handleRunCode}
                        disabled={isExecuting || !isConnected}
                    >
                        {isExecuting ? 'Running...' : '▶ Run Code'}
                    </button>

                    <div className="connection-status">
                        <div className={`status-dot ${isConnected ? '' : 'disconnected'}`}></div>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
            </header>

            <div className="main-content">
                <div className="editor-section">
                    <div className="users-bar">
                        <span style={{ fontSize: '12px', color: '#888' }}>
                            {users.length} user{users.length !== 1 ? 's' : ''} online
                        </span>
                        {users.map((user, idx) => (
                            <div
                                key={user.id}
                                className="user-avatar"
                                style={{ background: user.color }}
                                title={user.name}
                            >
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>

                    <Editor
                        height="100%"
                        language={language === 'cpp' ? 'cpp' : 'python'}
                        theme="vs-dark"
                        value={code}
                        onChange={handleEditorChange}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 4
                        }}
                    />
                </div>

                <div className="output-panel">
                    <div className="output-header">Output</div>
                    <div className={`output-content ${!output ? 'empty' : ''}`}>
                        {output || 'Click "Run Code" to see output here'}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
