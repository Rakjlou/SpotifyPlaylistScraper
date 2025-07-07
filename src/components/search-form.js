/**
 * Search form component
 * Handles search input, validation, and search operations
 */

import { searchManager } from '../modules/search-manager.js';
import { exportManager } from '../modules/export-manager.js';
import { storageManager } from '../modules/storage-manager.js';
import { uiManager } from '../modules/ui-manager.js';
import { configPanel } from './config-panel.js';

class SearchForm {
    constructor() {
        this.searchInput = null;
        this.searchBtn = null;
        this.exportAllBtn = null;
        this.stopBtn = null;
        this.initialized = false;
    }

    /**
     * Initialize the search form
     */
    initialize() {
        if (this.initialized) return;

        this.searchInput = document.getElementById('searchQuery');
        this.searchBtn = document.getElementById('searchBtn');
        this.exportAllBtn = document.getElementById('exportAllBtn');
        this.stopBtn = document.getElementById('stopBtn');

        if (!this.searchInput || !this.searchBtn || !this.exportAllBtn) {
            console.error('Search form elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadSavedQuery();
        this.initialized = true;
    }

    /**
     * Setup event listeners for the search form
     */
    setupEventListeners() {
        // Search button click
        uiManager.addEventListener(this.searchBtn, 'click', () => {
            this.performSearch();
        });

        // Export all button click
        uiManager.addEventListener(this.exportAllBtn, 'click', () => {
            this.performExportAll();
        });

        // Stop button click
        uiManager.addEventListener(this.stopBtn, 'click', () => {
            this.stopCurrentOperation();
        });

        // Enter key in search input
        uiManager.addEventListener(this.searchInput, 'keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Save search query on input
        uiManager.addEventListener(this.searchInput, 'input', () => {
            this.saveCurrentQuery();
        });

        // Search input validation
        uiManager.addEventListener(this.searchInput, 'blur', () => {
            this.validateSearchQuery();
        });

        // Global filter change event
        uiManager.addEventListener(document, 'filterResults', (e) => {
            this.handleFilterChange(e.detail.showWithoutEmails);
        });
    }

    /**
     * Perform search operation
     */
    async performSearch() {
        const query = this.getSearchQuery();
        if (!this.validateSearchQuery()) {
            return;
        }

        if (!configPanel.hasCredentials()) {
            configPanel.showValidationError('Please enter both Client ID and Client Secret before searching');
            return;
        }

        const credentials = configPanel.getCredentials();
        
        try {
            await searchManager.performSearch(query, credentials.clientId, credentials.clientSecret);
        } catch (error) {
            console.error('Search failed:', error);
            uiManager.showError(`Search failed: ${error.message}`);
        }
    }

    /**
     * Perform export all operation
     */
    async performExportAll() {
        const query = this.getSearchQuery();
        if (!this.validateSearchQuery()) {
            return;
        }

        if (!configPanel.hasCredentials()) {
            configPanel.showValidationError('Please enter both Client ID and Client Secret before exporting');
            return;
        }

        // Confirm with user about the potentially long operation
        const estimateResponse = await this.getExportEstimate(query);
        if (estimateResponse && !this.confirmLargeExport(estimateResponse)) {
            return;
        }

        const credentials = configPanel.getCredentials();
        
        try {
            await exportManager.exportAll(query, credentials.clientId, credentials.clientSecret);
        } catch (error) {
            console.error('Export failed:', error);
            uiManager.showError(`Export failed: ${error.message}`);
        }
    }

    /**
     * Stop current operation
     */
    stopCurrentOperation() {
        // Stop search if in progress
        searchManager.stopCurrentSearch();
        
        // Stop export if in progress
        exportManager.stopExport();
        
        uiManager.showSuccessMessage('Operation stopped');
    }

    /**
     * Get current search query
     * @returns {string} Current search query
     */
    getSearchQuery() {
        return this.searchInput?.value.trim() || '';
    }

    /**
     * Set search query
     * @param {string} query - Search query to set
     */
    setSearchQuery(query) {
        if (this.searchInput) {
            this.searchInput.value = query || '';
            this.saveCurrentQuery();
        }
    }

    /**
     * Validate search query
     * @returns {boolean} True if query is valid
     */
    validateSearchQuery() {
        const query = this.getSearchQuery();
        const isValid = query.length > 0;

        if (!isValid) {
            this.showQueryValidationError('Please enter a search query');
            return false;
        }

        if (query.length < 2) {
            this.showQueryValidationError('Search query must be at least 2 characters long');
            return false;
        }

        this.clearQueryValidationError();
        return true;
    }

    /**
     * Show query validation error
     * @param {string} message - Error message
     */
    showQueryValidationError(message) {
        if (this.searchInput) {
            this.searchInput.classList.add('error');
            setTimeout(() => this.searchInput.classList.remove('error'), 3000);
        }
        uiManager.showError(message);
    }

    /**
     * Clear query validation error
     */
    clearQueryValidationError() {
        if (this.searchInput) {
            this.searchInput.classList.remove('error');
        }
        uiManager.clearError();
    }

    /**
     * Save current query to storage
     */
    saveCurrentQuery() {
        const query = this.getSearchQuery();
        storageManager.saveLastSearchQuery(query);
    }

    /**
     * Load saved query from storage
     */
    loadSavedQuery() {
        const savedQuery = storageManager.loadLastSearchQuery();
        if (savedQuery) {
            this.setSearchQuery(savedQuery);
        }
    }

    /**
     * Handle filter change event
     * @param {boolean} showWithoutEmails - Whether to show playlists without emails
     */
    handleFilterChange(showWithoutEmails) {
        searchManager.filterDisplayedResults(showWithoutEmails);
    }

    /**
     * Get export estimate for large operations
     * @param {string} query - Search query
     * @returns {Promise<Object|null>} Export estimate or null if failed
     */
    async getExportEstimate(query) {
        try {
            // This would ideally make a quick API call to get total count
            // For now, we'll return null to skip the confirmation
            return null;
        } catch (error) {
            console.error('Failed to get export estimate:', error);
            return null;
        }
    }

    /**
     * Confirm large export operation with user
     * @param {Object} estimate - Export estimate object
     * @returns {boolean} User's confirmation
     */
    confirmLargeExport(estimate) {
        if (estimate.totalPlaylists > 1000) {
            const message = `This will export ${estimate.totalPlaylists.toLocaleString()} playlists, which may take ${estimate.estimatedTimeFormatted}. Continue?`;
            return uiManager.confirm(message);
        }
        return true;
    }

    /**
     * Enable/disable form controls
     * @param {boolean} enabled - Whether to enable controls
     */
    setEnabled(enabled) {
        if (this.searchInput) this.searchInput.disabled = !enabled;
        if (this.searchBtn) this.searchBtn.disabled = !enabled;
        if (this.exportAllBtn) this.exportAllBtn.disabled = !enabled;
    }

    /**
     * Get search form state
     * @returns {Object} Form state object
     */
    getFormState() {
        return {
            query: this.getSearchQuery(),
            isValid: this.validateSearchQuery(),
            hasCredentials: configPanel.hasCredentials(),
            canSearch: this.canPerformSearch(),
            canExport: this.canPerformExport()
        };
    }

    /**
     * Check if search can be performed
     * @returns {boolean} True if search is possible
     */
    canPerformSearch() {
        return this.validateSearchQuery() && configPanel.hasCredentials() && !this.isOperationInProgress();
    }

    /**
     * Check if export can be performed
     * @returns {boolean} True if export is possible
     */
    canPerformExport() {
        return this.validateSearchQuery() && configPanel.hasCredentials() && !this.isOperationInProgress();
    }

    /**
     * Check if any operation is currently in progress
     * @returns {boolean} True if operation is in progress
     */
    isOperationInProgress() {
        return exportManager.isExportInProgress();
    }

    /**
     * Clear search form
     */
    clear() {
        this.setSearchQuery('');
        storageManager.clearLastSearchQuery();
        this.clearQueryValidationError();
    }

    /**
     * Focus search input
     */
    focus() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Get search suggestions (placeholder for future enhancement)
     * @param {string} query - Current query
     * @returns {Array<string>} Array of suggestions
     */
    getSearchSuggestions(query) {
        // Common search patterns for email discovery
        const suggestions = [
            '@gmail.com',
            '@yahoo.com',
            '@hotmail.com',
            '@outlook.com',
            'contact',
            'booking',
            'promo',
            'submit',
            'demo'
        ];

        return suggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(query.toLowerCase())
        );
    }

    /**
     * Reset form to initial state
     */
    reset() {
        this.clear();
        this.setEnabled(true);
        uiManager.clearError();
    }

    /**
     * Get form validation status
     * @returns {Object} Validation status
     */
    getValidationStatus() {
        const query = this.getSearchQuery();
        
        return {
            hasQuery: query.length > 0,
            queryLength: query.length,
            isQueryValid: this.validateSearchQuery(),
            hasCredentials: configPanel.hasCredentials(),
            canSubmit: this.canPerformSearch()
        };
    }
}

export const searchForm = new SearchForm();