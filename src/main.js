/**
 * Main application entry point
 * Orchestrates all modules and components for the Spotify Playlist Scraper
 */

// Import all modules
import { spotifyAPI } from './modules/spotify-api.js';
import { searchManager } from './modules/search-manager.js';
import { exportManager } from './modules/export-manager.js';
import { storageManager } from './modules/storage-manager.js';
import { uiManager } from './modules/ui-manager.js';
import { emailExtractor } from './modules/email-extractor.js';
import { errorHandler } from './modules/error-handler.js';

// Import all components
import { configPanel } from './components/config-panel.js';
import { searchForm } from './components/search-form.js';
import { resultsTable } from './components/results-table.js';
import { progressBar } from './components/progress-bar.js';

/**
 * Main Application Class
 * Manages the lifecycle and coordination of all modules and components
 */
class SpotifyPlaylistScraper {
    constructor() {
        this.initialized = false;
        this.currentOperation = null;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('Initializing Spotify Playlist Scraper...');

            // Initialize core modules
            await this.initializeModules();

            // Initialize UI components
            await this.initializeComponents();

            // Setup global event handlers
            this.setupGlobalEventHandlers();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Load saved data
            this.loadSavedData();

            this.initialized = true;
            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            uiManager.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Initialize all core modules
     */
    async initializeModules() {
        // Initialize storage manager first (needed by others)
        storageManager.initialize();

        // Initialize UI manager
        uiManager.initialize();

        // Initialize search manager
        searchManager.initialize();

        // Initialize export manager
        exportManager.reset();

        console.log('Core modules initialized');
    }

    /**
     * Initialize all UI components
     */
    async initializeComponents() {
        // Initialize components in dependency order
        configPanel.initialize();
        searchForm.initialize();
        resultsTable.initialize();
        progressBar.initialize();

        console.log('UI components initialized');
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle search manager events
        this.setupSearchManagerEvents();

        // Handle export manager events
        this.setupExportManagerEvents();

        // Handle UI events
        this.setupUIEvents();

        // Handle pagination events
        this.setupPaginationEvents();

        // Handle filter events
        this.setupFilterEvents();

        console.log('Global event handlers setup');
    }

    /**
     * Setup search manager event handlers
     */
    setupSearchManagerEvents() {
        // Listen for search completion
        document.addEventListener('searchComplete', (e) => {
            const { playlists, currentPage, totalPages } = e.detail;
            resultsTable.updateResults(playlists);
            
            if (totalPages > 1) {
                resultsTable.updatePagination(currentPage + 1, totalPages, currentPage > 0, currentPage < totalPages - 1);
            }
        });

        // Listen for search errors
        document.addEventListener('searchError', (e) => {
            uiManager.showError(e.detail.message);
        });

        // Override the search manager's processAndDisplayPlaylists to work with our components
        const originalProcessAndDisplay = searchManager.processAndDisplayPlaylists;
        searchManager.processAndDisplayPlaylists = async function(playlists) {
            resultsTable.setupTable();
            
            for (let i = 0; i < playlists.length; i++) {
                if (this.currentAbortController?.signal.aborted) break;

                const playlist = playlists[i];
                if (!playlist) {
                    uiManager.updateProgress(i + 1, playlists.length, this.totalEmailsFound);
                    continue;
                }

                const playlistData = await spotifyAPI.getDetailedPlaylist(playlist.id);
                if (playlistData) {
                    this.pagePlaylists.push(playlistData);
                    this.totalEmailsFound += playlistData.emails.length;
                    resultsTable.addPlaylist(playlistData);
                }
                
                uiManager.updateProgress(i + 1, playlists.length, this.totalEmailsFound);
            }

            this.displayedPlaylistCount = this.pagePlaylists.length;
            uiManager.updateResultsCount(this.displayedPlaylistCount, this.totalEmailsFound);
        };

        // Override the search manager's updatePagination to work with our components
        searchManager.updatePagination = function() {
            const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
            const currentPageDisplay = this.currentPage + 1;
            
            resultsTable.updatePagination(
                currentPageDisplay,
                totalPages,
                this.currentPage > 0,
                this.currentPage < totalPages - 1
            );
        };
    }

    /**
     * Setup export manager event handlers
     */
    setupExportManagerEvents() {
        // Override export manager methods to work with our components
        const originalHandleStoppedExport = exportManager.handleStoppedExport;
        exportManager.handleStoppedExport = function() {
            if (this.allPlaylistsWithEmails.length > 0) {
                storageManager.storePartialExportData(this.allPlaylistsWithEmails);
                
                progressBar.showCustomContent(
                    `Export stopped. ${this.allPlaylistsWithEmails.length} playlists with emails were found.<br>` +
                    `<button onclick="window.app.exportPartialData(); return false;" style="margin-top: 10px; padding: 8px 16px; background: #1db954; color: white; border: none; border-radius: 4px; cursor: pointer;">` +
                    `Export ${this.allPlaylistsWithEmails.length} playlists</button>`
                );
                
                uiManager.disableButtons(false);
                this.currentAbortController = null;
            } else {
                uiManager.cleanupAfterLoading("Export stopped. No playlists with emails found.");
            }
        };
    }

    /**
     * Setup UI event handlers
     */
    setupUIEvents() {
        // Handle window beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (exportManager.isExportInProgress()) {
                e.preventDefault();
                e.returnValue = 'Export is in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && exportManager.isExportInProgress()) {
                console.log('Page hidden during export - continuing in background');
            }
        });
    }

    /**
     * Setup pagination event handlers
     */
    setupPaginationEvents() {
        // Override the pagination button click handlers
        window.loadPage = async (page) => {
            await searchManager.goToPage(page);
        };

        // Add global functions for pagination
        window.goToPreviousPage = async () => {
            await searchManager.goToPreviousPage();
        };

        window.goToNextPage = async () => {
            await searchManager.goToNextPage();
        };
    }

    /**
     * Setup filter event handlers
     */
    setupFilterEvents() {
        // Listen for filter events from UI
        document.addEventListener('filterResults', (e) => {
            const showWithoutEmails = e.detail.showWithoutEmails;
            const currentPlaylists = searchManager.getCurrentPagePlaylists();
            
            if (currentPlaylists.length > 0) {
                resultsTable.handleFilterChange(showWithoutEmails);
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Start search
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                searchForm.performSearch();
            }

            // Escape: Stop current operation
            if (e.key === 'Escape') {
                this.stopCurrentOperation();
            }

            // Ctrl/Cmd + E: Export all
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                searchForm.performExportAll();
            }

            // Arrow keys for pagination (when not in input fields)
            if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    searchManager.goToPreviousPage();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    searchManager.goToNextPage();
                }
            }
        });

        console.log('Keyboard shortcuts setup');
    }

    /**
     * Load saved data from storage
     */
    loadSavedData() {
        // Load credentials
        configPanel.loadSavedCredentials();

        // Load last search query
        searchForm.loadSavedQuery();

        console.log('Saved data loaded');
    }

    /**
     * Stop current operation
     */
    stopCurrentOperation() {
        searchManager.stopCurrentSearch();
        exportManager.stopExport();
    }

    /**
     * Export partial data (exposed globally for button onclick)
     */
    exportPartialData() {
        exportManager.exportPartialData();
    }

    /**
     * Get application status
     * @returns {Object} Application status object
     */
    getStatus() {
        return {
            initialized: this.initialized,
            searchStats: searchManager.getSearchStats(),
            exportStats: exportManager.getExportStats(),
            cacheStats: storageManager.getCacheStats(),
            hasCredentials: configPanel.hasCredentials()
        };
    }

    /**
     * Reset application to initial state
     */
    reset() {
        this.stopCurrentOperation();
        searchManager.clearResults();
        resultsTable.reset();
        progressBar.reset();
        uiManager.clearError();
        console.log('Application reset');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopCurrentOperation();
        storageManager.clearPlaylistCache();
        console.log('Application cleanup completed');
    }
}

// Create and initialize the application
const app = new SpotifyPlaylistScraper();

// Make app globally available for debugging and inline event handlers
window.app = app;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.initialize();
    });
} else {
    app.initialize();
}

// Export for module usage
export default app;