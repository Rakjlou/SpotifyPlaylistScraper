/**
 * Configuration panel component
 * Handles API credentials input and validation
 */

import { storageManager } from '../modules/storage-manager.js';
import { uiManager } from '../modules/ui-manager.js';

class ConfigPanel {
    constructor() {
        this.clientIdInput = null;
        this.clientSecretInput = null;
        this.initialized = false;
    }

    /**
     * Initialize the config panel
     */
    initialize() {
        if (this.initialized) return;

        this.clientIdInput = document.getElementById('clientId');
        this.clientSecretInput = document.getElementById('clientSecret');

        if (!this.clientIdInput || !this.clientSecretInput) {
            console.error('Config panel inputs not found');
            return;
        }

        this.setupEventListeners();
        this.loadSavedCredentials();
        this.initialized = true;
    }

    /**
     * Setup event listeners for the config panel
     */
    setupEventListeners() {
        // Save credentials on input
        uiManager.addEventListener(this.clientIdInput, 'input', (e) => {
            this.saveCredentials();
            this.validateCredentials();
        });

        uiManager.addEventListener(this.clientSecretInput, 'input', (e) => {
            this.saveCredentials();
            this.validateCredentials();
        });

        // Clear button functionality (if we add one)
        uiManager.addEventListener(document, 'click', (e) => {
            if (e.target.id === 'clearCredentials') {
                this.clearCredentials();
            }
        });

        // Show/hide password functionality
        uiManager.addEventListener(document, 'click', (e) => {
            if (e.target.classList.contains('toggle-password')) {
                this.togglePasswordVisibility(e.target);
            }
        });
    }

    /**
     * Load saved credentials from storage
     */
    loadSavedCredentials() {
        const credentials = storageManager.loadCredentials();
        
        if (credentials.clientId && this.clientIdInput) {
            this.clientIdInput.value = credentials.clientId;
        }
        
        if (credentials.clientSecret && this.clientSecretInput) {
            this.clientSecretInput.value = credentials.clientSecret;
        }

        this.validateCredentials();
    }

    /**
     * Save current credentials to storage
     */
    saveCredentials() {
        if (!this.clientIdInput || !this.clientSecretInput) return;

        const clientId = this.clientIdInput.value.trim();
        const clientSecret = this.clientSecretInput.value.trim();

        storageManager.saveCredentials(clientId, clientSecret);
    }

    /**
     * Clear credentials from inputs and storage
     */
    clearCredentials() {
        if (this.clientIdInput) this.clientIdInput.value = '';
        if (this.clientSecretInput) this.clientSecretInput.value = '';
        
        storageManager.clearCredentials();
        this.validateCredentials();
        
        uiManager.showSuccessMessage('Credentials cleared');
    }

    /**
     * Get current credentials from inputs
     * @returns {Object} Object with clientId and clientSecret
     */
    getCredentials() {
        return {
            clientId: this.clientIdInput?.value.trim() || '',
            clientSecret: this.clientSecretInput?.value.trim() || ''
        };
    }

    /**
     * Set credentials in inputs
     * @param {string} clientId - Client ID
     * @param {string} clientSecret - Client Secret
     */
    setCredentials(clientId, clientSecret) {
        if (this.clientIdInput) this.clientIdInput.value = clientId || '';
        if (this.clientSecretInput) this.clientSecretInput.value = clientSecret || '';
        
        this.saveCredentials();
        this.validateCredentials();
    }

    /**
     * Validate current credentials
     * @returns {boolean} True if credentials are valid
     */
    validateCredentials() {
        const { clientId, clientSecret } = this.getCredentials();
        const isValid = clientId.length > 0 && clientSecret.length > 0;

        // Add visual feedback
        this.updateValidationState(isValid);

        return isValid;
    }

    /**
     * Update visual validation state
     * @param {boolean} isValid - Whether credentials are valid
     */
    updateValidationState(isValid) {
        const configSection = document.querySelector('.config-section');
        if (!configSection) return;

        // Remove existing validation classes
        configSection.classList.remove('valid', 'invalid');

        // Add appropriate validation class
        if (isValid) {
            configSection.classList.add('valid');
        } else {
            configSection.classList.add('invalid');
        }

        // Update input field styling
        [this.clientIdInput, this.clientSecretInput].forEach(input => {
            if (input) {
                if (input.value.trim()) {
                    input.classList.add('has-value');
                } else {
                    input.classList.remove('has-value');
                }
            }
        });
    }

    /**
     * Toggle password visibility for client secret
     * @param {HTMLElement} button - Toggle button element
     */
    togglePasswordVisibility(button) {
        if (!this.clientSecretInput) return;

        const isPassword = this.clientSecretInput.type === 'password';
        this.clientSecretInput.type = isPassword ? 'text' : 'password';
        
        // Update button text/icon if needed
        if (button) {
            button.textContent = isPassword ? '👁️‍🗨️' : '👁️';
            button.title = isPassword ? 'Hide' : 'Show';
        }
    }

    /**
     * Check if credentials are configured
     * @returns {boolean} True if both credentials are provided
     */
    hasCredentials() {
        const { clientId, clientSecret } = this.getCredentials();
        return clientId.length > 0 && clientSecret.length > 0;
    }

    /**
     * Show credential validation error
     * @param {string} message - Error message
     */
    showValidationError(message) {
        uiManager.showError(message);
        
        // Highlight invalid fields
        [this.clientIdInput, this.clientSecretInput].forEach(input => {
            if (input && !input.value.trim()) {
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 3000);
            }
        });
    }

    /**
     * Export credentials (for backup/sharing - without secret)
     * @returns {Object} Exportable credentials object
     */
    exportCredentials() {
        const { clientId } = this.getCredentials();
        return {
            clientId: clientId,
            // Note: We intentionally don't export the secret for security
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import credentials (clientId only for security)
     * @param {Object} credentials - Credentials object
     */
    importCredentials(credentials) {
        if (credentials.clientId) {
            if (this.clientIdInput) {
                this.clientIdInput.value = credentials.clientId;
            }
            this.saveCredentials();
            this.validateCredentials();
            uiManager.showSuccessMessage('Client ID imported successfully');
        }
    }

    /**
     * Get help text for credentials
     * @returns {string} Help text
     */
    getHelpText() {
        return `
            To get your Spotify API credentials:
            1. Go to https://developer.spotify.com/dashboard
            2. Log in with your Spotify account
            3. Click "Create App"
            4. Fill in the required information
            5. Copy the Client ID and Client Secret
        `;
    }

    /**
     * Show help modal/tooltip
     */
    showHelp() {
        const helpText = this.getHelpText();
        alert(helpText); // In a real app, this would be a proper modal
    }

    /**
     * Reset the config panel
     */
    reset() {
        this.clearCredentials();
        this.updateValidationState(false);
    }

    /**
     * Get validation status
     * @returns {Object} Validation status object
     */
    getValidationStatus() {
        const { clientId, clientSecret } = this.getCredentials();
        
        return {
            hasClientId: clientId.length > 0,
            hasClientSecret: clientSecret.length > 0,
            isValid: this.validateCredentials(),
            clientIdLength: clientId.length,
            clientSecretLength: clientSecret.length
        };
    }
}

export const configPanel = new ConfigPanel();