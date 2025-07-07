/**
 * Search management module
 * Handles search logic, pagination, and results management
 */

import { spotifyAPI } from './spotify-api.js';
import { storageManager } from './storage-manager.js';
import { uiManager } from './ui-manager.js';
import { classifyError } from './error-handler.js';

class SearchManager {
    constructor() {
        this.currentPage = 0;
        this.totalResults = 0;
        this.currentQuery = '';
        this.resultsPerPage = 50;
        this.pagePlaylists = []; // Stores full data for the currently displayed page
        this.displayedPlaylistCount = 0;
        this.totalEmailsFound = 0;
        this.currentAbortController = null;
    }

    /**
     * Perform a new search
     * @param {string} query - Search query
     * @param {string} clientId - Spotify Client ID
     * @param {string} clientSecret - Spotify Client Secret
     * @returns {Promise<void>}
     */
    async performSearch(query, clientId, clientSecret) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            uiManager.showError('Please enter a search query');
            return;
        }

        // Get or refresh access token
        let accessToken = spotifyAPI.accessToken;
        if (!accessToken) {
            accessToken = await spotifyAPI.getAccessToken(clientId, clientSecret);
            if (!accessToken) return;
        }

        // Save search query and credentials
        storageManager.saveLastSearchQuery(trimmedQuery);
        storageManager.saveCredentials(clientId, clientSecret);

        // Reset search state
        this.currentQuery = trimmedQuery;
        this.currentPage = 0;
        this.pagePlaylists = [];
        this.displayedPlaylistCount = 0;
        this.totalEmailsFound = 0;

        // Load first page
        await this.loadPage(0);
    }

    /**
     * Load a specific page of results
     * @param {number} page - Page number (0-indexed)
     * @returns {Promise<void>}
     */
    async loadPage(page) {
        if (page < 0) return;

        this.currentAbortController = new AbortController();
        spotifyAPI.setAbortController(this.currentAbortController);
        
        uiManager.setupForLoading(`Loading page ${page + 1}...`);

        try {
            // Search for playlists
            const searchResults = await spotifyAPI.searchPlaylists(
                this.currentQuery,
                this.resultsPerPage,
                page * this.resultsPerPage
            );

            if (!searchResults) {
                // Search was aborted or failed
                return;
            }

            this.totalResults = searchResults.playlists.total;
            this.currentPage = page;

            // Process and display playlists
            await this.processAndDisplayPlaylists(searchResults.playlists.items);
            
            // Update pagination
            this.updatePagination();

        } catch (error) {
            const errorInfo = classifyError(error, 'Search', this.currentAbortController);
            if (errorInfo.type === 'user_abort') {
                return;
            } else if (errorInfo.message) {
                uiManager.showError(errorInfo.message);
            }
        } finally {
            uiManager.cleanupAfterLoading("Page loaded.");
        }
    }

    /**
     * Process and display playlists for current page
     * @param {Array} playlists - Array of playlist objects from Spotify API
     * @returns {Promise<void>}
     */
    async processAndDisplayPlaylists(playlists) {
        const totalToProcess = playlists.length;
        this.totalEmailsFound = 0;
        this.pagePlaylists = []; // Reset for new page

        // Setup results table
        uiManager.setupResultsTable();

        for (let i = 0; i < playlists.length; i++) {
            if (this.currentAbortController?.signal.aborted) break;

            const playlist = playlists[i];
            if (!playlist) {
                uiManager.updateProgress(i + 1, totalToProcess, this.totalEmailsFound);
                continue;
            }

            // Get detailed playlist data
            const playlistData = await spotifyAPI.getDetailedPlaylist(playlist.id);
            if (playlistData) {
                this.pagePlaylists.push(playlistData);
                this.totalEmailsFound += playlistData.emails.length;
                
                // Add to results table
                uiManager.appendPlaylistToTable(playlistData);
            }
            
            uiManager.updateProgress(i + 1, totalToProcess, this.totalEmailsFound);
        }

        // Update displayed count
        this.displayedPlaylistCount = this.pagePlaylists.length;
        uiManager.updateResultsCount(this.displayedPlaylistCount, this.totalEmailsFound);
    }

    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        const currentPageDisplay = this.currentPage + 1;
        
        uiManager.updatePaginationControls(
            currentPageDisplay,
            totalPages,
            this.currentPage > 0,
            this.currentPage < totalPages - 1
        );
    }

    /**
     * Go to previous page
     * @returns {Promise<void>}
     */
    async goToPreviousPage() {
        if (this.currentPage > 0) {
            await this.loadPage(this.currentPage - 1);
        }
    }

    /**
     * Go to next page
     * @returns {Promise<void>}
     */
    async goToNextPage() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        if (this.currentPage < totalPages - 1) {
            await this.loadPage(this.currentPage + 1);
        }
    }

    /**
     * Go to specific page
     * @param {number} page - Page number (0-indexed)
     * @returns {Promise<void>}
     */
    async goToPage(page) {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        if (page >= 0 && page < totalPages) {
            await this.loadPage(page);
        }
    }

    /**
     * Stop current search operation
     */
    stopCurrentSearch() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            console.log("Search stopped by user.");
        }
    }

    /**
     * Filter displayed results based on email presence
     * @param {boolean} showWithoutEmails - Whether to show playlists without emails
     */
    filterDisplayedResults(showWithoutEmails) {
        uiManager.filterDisplayedResults(showWithoutEmails);
    }

    /**
     * Get search statistics
     * @returns {Object} Search statistics
     */
    getSearchStats() {
        return {
            currentPage: this.currentPage,
            totalResults: this.totalResults,
            totalPages: Math.ceil(this.totalResults / this.resultsPerPage),
            currentQuery: this.currentQuery,
            displayedPlaylistCount: this.displayedPlaylistCount,
            totalEmailsFound: this.totalEmailsFound,
            resultsPerPage: this.resultsPerPage
        };
    }

    /**
     * Get current page playlists
     * @returns {Array} Array of playlist objects
     */
    getCurrentPagePlaylists() {
        return this.pagePlaylists;
    }

    /**
     * Get playlists with emails from current page
     * @returns {Array} Array of playlist objects that have emails
     */
    getPlaylistsWithEmails() {
        return this.pagePlaylists.filter(playlist => playlist.emails.length > 0);
    }

    /**
     * Clear search results
     */
    clearResults() {
        this.currentPage = 0;
        this.totalResults = 0;
        this.currentQuery = '';
        this.pagePlaylists = [];
        this.displayedPlaylistCount = 0;
        this.totalEmailsFound = 0;
        
        uiManager.clearResults();
    }

    /**
     * Initialize search manager
     */
    initialize() {
        // Load saved search query if available
        const savedQuery = storageManager.loadLastSearchQuery();
        if (savedQuery) {
            const searchInput = document.getElementById('searchQuery');
            if (searchInput) {
                searchInput.value = savedQuery;
            }
        }
    }

    /**
     * Get estimated time for full search
     * @returns {Object} Time estimation object
     */
    getSearchTimeEstimate() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        const avgTimePerPage = 10; // seconds (rough estimate)
        const totalEstimatedTime = totalPages * avgTimePerPage;
        
        return {
            totalPages,
            estimatedTimeSeconds: totalEstimatedTime,
            estimatedTimeFormatted: this.formatTime(totalEstimatedTime)
        };
    }

    /**
     * Format time in seconds to human readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }
}

export const searchManager = new SearchManager();