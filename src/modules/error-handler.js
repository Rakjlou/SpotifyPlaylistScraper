/**
 * Error handling module
 * Provides error classification and user-friendly messaging
 */

class ErrorHandler {
    /**
     * Classifies errors and generates appropriate messages
     * @param {Error} error - The error object to classify
     * @param {string} operation - The operation that was being performed
     * @param {AbortController} abortController - The current abort controller
     * @returns {Object} Object with type and message properties
     */
    classifyError(error, operation = 'operation', abortController = null) {
        if (error.name === 'AbortError') {
            if (abortController && abortController.signal.aborted) {
                return { type: 'user_abort', message: null };
            } else {
                return { 
                    type: 'timeout', 
                    message: `${operation} timed out. Please check your internet connection and try again.` 
                };
            }
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return { 
                type: 'network', 
                message: 'Network connection failed. Please check your internet connection and try again.' 
            };
        } else if (error.message.includes('DNS') || error.message.includes('resolve')) {
            return { 
                type: 'dns', 
                message: 'Unable to reach Spotify servers. Please check your internet connection.' 
            };
        } else {
            return { 
                type: 'other', 
                message: `${operation} error: ${error.message}` 
            };
        }
    }

    /**
     * Handles common HTTP response errors
     * @param {Response} response - The HTTP response object
     * @param {string} context - Context of the request (e.g., 'authentication', 'search')
     * @returns {string} User-friendly error message
     */
    handleHttpError(response, context = 'request') {
        switch (response.status) {
            case 400:
                return `Invalid ${context} parameters. Please check your input.`;
            case 401:
                return 'Authentication failed. Please check your credentials and try again.';
            case 403:
                return 'Access denied. You may not have permission to perform this action.';
            case 404:
                return 'Resource not found. It may have been deleted or moved.';
            case 429:
                return 'Rate limit exceeded. Please wait a moment before trying again.';
            case 500:
            case 502:
            case 503:
                return 'Server error. Please try again in a few minutes.';
            default:
                return `${context} failed: ${response.status} ${response.statusText}`;
        }
    }

    /**
     * Formats error messages for display
     * @param {string} message - The error message
     * @param {string} severity - Error severity level ('error', 'warning', 'info')
     * @returns {Object} Formatted error object
     */
    formatErrorMessage(message, severity = 'error') {
        return {
            message,
            severity,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Logs errors to console with context
     * @param {Error} error - The error object
     * @param {string} context - Context information
     * @param {Object} additionalData - Additional data to log
     */
    logError(error, context = 'Unknown', additionalData = {}) {
        console.error(`[${context}] Error occurred:`, {
            message: error.message,
            name: error.name,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            ...additionalData
        });
    }

    /**
     * Determines if an error is recoverable
     * @param {Error} error - The error object
     * @returns {boolean} True if the error is recoverable
     */
    isRecoverableError(error) {
        const recoverableErrors = [
            'timeout',
            'network',
            'dns',
            'rate_limit'
        ];
        
        const classification = this.classifyError(error);
        return recoverableErrors.includes(classification.type);
    }

    /**
     * Creates a retry strategy for recoverable errors
     * @param {Error} error - The error object
     * @param {number} attempts - Number of retry attempts
     * @returns {Object} Retry strategy object
     */
    createRetryStrategy(error, attempts = 0) {
        const classification = this.classifyError(error);
        const maxAttempts = 3;
        const baseDelay = 1000; // 1 second
        
        if (!this.isRecoverableError(error) || attempts >= maxAttempts) {
            return {
                shouldRetry: false,
                delay: 0,
                remainingAttempts: 0
            };
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempts);
        
        return {
            shouldRetry: true,
            delay,
            remainingAttempts: maxAttempts - attempts - 1
        };
    }
}

export const errorHandler = new ErrorHandler();

/**
 * Convenience function for error classification
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @param {AbortController} abortController - The current abort controller
 * @returns {Object} Classified error object
 */
export function classifyError(error, operation = 'operation', abortController = null) {
    return errorHandler.classifyError(error, operation, abortController);
}