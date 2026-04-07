/**
 * Operational Transformation (OT) Engine
 * 
 * This implementation handles concurrent operations in a collaborative editor.
 * It prevents conflicts when multiple users edit the same document simultaneously.
 * 
 * Core Concepts:
 * - Operations: INSERT, DELETE, RETAIN
 * - Transformation: Adjust operations based on concurrent changes
 * - Convergence: Ensure all clients reach the same final state
 */

class Operation {
    constructor(type, position, content = '', length = 0) {
        this.type = type // 'insert', 'delete', 'retain'
        this.position = position
        this.content = content // For insert operations
        this.length = length || content.length // For delete/retain
    }
}

class OTEngine {
    constructor() {
        this.operations = []
    }

    /**
     * Transform operation A against operation B
     * Returns transformed version of A that can be applied after B
     */
    transform(opA, opB) {
        // If B is an insert before A's position, shift A forward
        if (opB.type === 'insert' && opB.position <= opA.position) {
            return new Operation(
                opA.type,
                opA.position + opB.length,
                opA.content,
                opA.length
            )
        }

        // If B is a delete before A's position, shift A backward
        if (opB.type === 'delete' && opB.position < opA.position) {
            const deletedBeforeA = Math.min(opB.length, opA.position - opB.position)
            return new Operation(
                opA.type,
                opA.position - deletedBeforeA,
                opA.content,
                opA.length
            )
        }

        // If B is a delete that overlaps with A's position
        if (opB.type === 'delete' &&
            opB.position <= opA.position &&
            opB.position + opB.length > opA.position) {
            // A's position was deleted, move to deletion point
            return new Operation(
                opA.type,
                opB.position,
                opA.content,
                opA.length
            )
        }

        // No transformation needed
        return opA
    }

    /**
     * Apply an operation to a document
     */
    apply(document, operation) {
        switch (operation.type) {
            case 'insert':
                return (
                    document.slice(0, operation.position) +
                    operation.content +
                    document.slice(operation.position)
                )

            case 'delete':
                return (
                    document.slice(0, operation.position) +
                    document.slice(operation.position + operation.length)
                )

            case 'retain':
                return document

            default:
                return document
        }
    }

    /**
     * Compose two operations into a single operation
     * This is used to reduce operation history
     */
    compose(opA, opB) {
        // If both are inserts at same position, combine
        if (opA.type === 'insert' && opB.type === 'insert' &&
            opA.position + opA.length === opB.position) {
            return new Operation('insert', opA.position, opA.content + opB.content)
        }

        // If both are deletes at adjacent positions, combine
        if (opA.type === 'delete' && opB.type === 'delete' &&
            opA.position === opB.position) {
            return new Operation('delete', opA.position, '', opA.length + opB.length)
        }

        // Cannot compose, return null
        return null
    }

    /**
     * Invert an operation (for undo functionality)
     */
    invert(operation, document) {
        switch (operation.type) {
            case 'insert':
                return new Operation('delete', operation.position, '', operation.length)

            case 'delete':
                const deleted = document.slice(
                    operation.position,
                    operation.position + operation.length
                )
                return new Operation('insert', operation.position, deleted)

            default:
                return operation
        }
    }

    /**
     * Transform a client operation against all concurrent server operations
     * This is the core conflict resolution mechanism
     */
    transformAgainstOperations(clientOp, serverOps) {
        let transformed = clientOp

        for (const serverOp of serverOps) {
            transformed = this.transform(transformed, serverOp)
        }

        return transformed
    }

    /**
     * Validate that an operation is safe to apply
     */
    validate(operation, documentLength) {
        if (operation.position < 0 || operation.position > documentLength) {
            return false
        }

        if (operation.type === 'delete') {
            if (operation.position + operation.length > documentLength) {
                return false
            }
        }

        return true
    }
}

export default OTEngine
