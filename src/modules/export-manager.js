/**
 * Export management module
 * Handles bulk export operations with progress tracking
 */

import { spotifyAPI } from './spotify-api.js';
import { storageManager } from './storage-manager.js';
import { uiManager } from './ui-manager.js';
import { classifyError } from './error-handler.js';

class ExportManager {
    constructor() {
        this.currentAbortController = null;
        this.exportInProgress = false;
        this.totalToProcess = 0;
        this.processedCount = 0;
        this.totalEmailsFound = 0;
        this.allPlaylistsWithEmails = [];
    }

    /**
     * Export all search results
     * @param {string} query - Search query
     * @param {string} clientId - Spotify Client ID
     * @param {string} clientSecret - Spotify Client Secret
     * @returns {Promise<void>}
     */
    async exportAll(query, clientId, clientSecret) {
        let userStopped = false;
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

        // Initialize export state
        this.exportInProgress = true;
        this.currentAbortController = new AbortController();
        this.processedCount = 0;
        this.totalEmailsFound = 0;
        this.allPlaylistsWithEmails = [];
        
        spotifyAPI.setAbortController(this.currentAbortController);
        uiManager.setupForLoading('Starting full export...');

        try {
            // Get total number of results
            const initialResponse = await spotifyAPI.searchPlaylists(trimmedQuery, 1, 0);
            if (!initialResponse) {
                return;
            }

            const totalResults = initialResponse.playlists.total;
            this.totalToProcess = totalResults;
            
            if (totalResults === 0) {
                uiManager.updateProgressText('No playlists found for this query.');
                return;
            }

            uiManager.updateProgressText(`Found ${totalResults} playlists. Starting export...`);
            
            // Setup results table for displaying found playlists
            uiManager.setupResultsTable();

            // Process all pages
            const resultsPerPage = 50;
            const totalPages = Math.ceil(totalResults / resultsPerPage);
            
            for (let page = 0; page < totalPages; page++) {
                if (this.currentAbortController.signal.aborted) {
                    userStopped = true;
                    break;
                }

                // Get page of results
                const searchResults = await spotifyAPI.searchPlaylists(
                    trimmedQuery,
                    resultsPerPage,
                    page * resultsPerPage
                );

                if (!searchResults) {
                    continue;
                }

                // Process each playlist in the page
                for (const playlist of searchResults.playlists.items) {
                    if (this.currentAbortController.signal.aborted) {
                        userStopped = true;
                        break;
                    }

                    if (!playlist) {
                        this.processedCount++;
                        uiManager.updateProgress(this.processedCount, this.totalToProcess, this.totalEmailsFound);
                        continue;
                    }

                    // Get detailed playlist data
                    const playlistData = await spotifyAPI.getDetailedPlaylist(playlist.id);
                    if (playlistData) {
                        if (playlistData.emails.length > 0) {
                            this.allPlaylistsWithEmails.push(playlistData);
                            this.totalEmailsFound += playlistData.emails.length;
                        }
                        uiManager.appendPlaylistToTable(playlistData);
                    }
                    
                    this.processedCount++;
                    uiManager.updateProgress(this.processedCount, this.totalToProcess, this.totalEmailsFound);
                }

                if (userStopped) break;
            }

            // Hide pagination during export
            uiManager.hidePagination();

            // Handle export completion or user stop
            if (userStopped) {
                await this.handleStoppedExport();
            } else {
                await this.handleCompletedExport();
            }

        } catch (error) {
            const errorInfo = classifyError(error, 'Export', this.currentAbortController);
            if (errorInfo.type === 'user_abort') {
                userStopped = true;
                await this.handleStoppedExport();
            } else if (errorInfo.message) {
                uiManager.showError(errorInfo.message);
            }
        } finally {
            this.exportInProgress = false;
            if (!userStopped) {
                uiManager.cleanupAfterLoading("Export finished.");
            }
        }
    }

    /**
     * Handle export completion
     * @private
     */
    async handleCompletedExport() {
        if (this.allPlaylistsWithEmails.length > 0) {
            storageManager.exportData(this.allPlaylistsWithEmails);
            uiManager.updateProgressText(`Export completed. ${this.allPlaylistsWithEmails.length} playlists with emails exported.`);
        } else {
            uiManager.updateProgressText('No playlists with emails found.');
        }
    }

    /**
     * Handle stopped export
     * @private
     */
    async handleStoppedExport() {
        if (this.allPlaylistsWithEmails.length > 0) {
            storageManager.storePartialExportData(this.allPlaylistsWithEmails);
            
            const progressText = document.getElementById('progressText');
            if (progressText) {
                progressText.innerHTML = `Export stopped. ${this.allPlaylistsWithEmails.length} playlists with emails were found.<br>` +
                    `<button onclick="window.exportManager.exportPartialData(); return false;" style="margin-top: 10px; padding: 8px 16px; background: #1db954; color: white; border: none; border-radius: 4px; cursor: pointer;">` +
                    `Export ${this.allPlaylistsWithEmails.length} playlists</button>`;
            }
            
            uiManager.disableButtons(false);
            this.currentAbortController = null;
            // Keep status section visible to show the export button
        } else {
            uiManager.cleanupAfterLoading("Export stopped. No playlists with emails found.");
        }
    }

    /**
     * Export partial data that was collected before stopping
     */
    exportPartialData() {
        const partialData = storageManager.getPartialExportData();
        if (partialData && partialData.length > 0) {
            storageManager.exportData(partialData);
            uiManager.updateProgressText(`Partial export completed. ${partialData.length} playlists exported.`);
            storageManager.clearPartialExportData();
        }
    }

    /**
     * Stop current export operation
     */
    stopExport() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            console.log("Export stopped by user.");
        }
    }

    /**
     * Check if export is currently in progress
     * @returns {boolean} True if export is in progress
     */
    isExportInProgress() {
        return this.exportInProgress;
    }

    /**
     * Get export statistics
     * @returns {Object} Export statistics
     */
    getExportStats() {
        return {
            totalToProcess: this.totalToProcess,
            processedCount: this.processedCount,
            totalEmailsFound: this.totalEmailsFound,
            playlistsWithEmails: this.allPlaylistsWithEmails.length,
            progressPercentage: this.totalToProcess > 0 ? (this.processedCount / this.totalToProcess) * 100 : 0,
            isInProgress: this.exportInProgress
        };
    }

    /**
     * Export current page results only
     * @param {Array} playlists - Array of playlist objects from current page
     */
    exportCurrentPage(playlists) {
        if (!Array.isArray(playlists) || playlists.length === 0) {
            uiManager.showError('No playlists to export on current page');
            return;
        }

        const playlistsWithEmails = playlists.filter(playlist => playlist.emails.length > 0);
        
        if (playlistsWithEmails.length === 0) {
            uiManager.showError('No playlists with emails found on current page');
            return;
        }

        storageManager.exportData(playlistsWithEmails, `spotify-playlist-page-export-${Date.now()}.json`);
        uiManager.updateProgressText(`Page export completed. ${playlistsWithEmails.length} playlists with emails exported.`);
    }

    /**
     * Export filtered results
     * @param {Array} playlists - Array of filtered playlist objects
     * @param {string} filterType - Type of filter applied
     */
    exportFiltered(playlists, filterType = 'filtered') {
        if (!Array.isArray(playlists) || playlists.length === 0) {
            uiManager.showError('No playlists to export in filtered results');
            return;
        }

        storageManager.exportData(playlists, `spotify-playlist-${filterType}-export-${Date.now()}.json`);
        uiManager.updateProgressText(`${filterType} export completed. ${playlists.length} playlists exported.`);
    }

    /**
     * Estimate export time
     * @param {number} totalPlaylists - Total number of playlists to process
     * @returns {Object} Time estimation
     */
    estimateExportTime(totalPlaylists) {
        const avgTimePerPlaylist = 0.5; // seconds (rough estimate)
        const totalEstimatedTime = Math.ceil(totalPlaylists * avgTimePerPlaylist);
        
        return {
            totalPlaylists,
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
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        let timeString = '';
        if (hours > 0) {
            timeString += `${hours}h `;
        }
        if (minutes > 0) {
            timeString += `${minutes}m `;
        }
        if (remainingSeconds > 0 || timeString === '') {
            timeString += `${remainingSeconds}s`;
        }
        
        return timeString.trim();
    }

    /**
     * Reset export state
     */
    reset() {
        this.currentAbortController = null;
        this.exportInProgress = false;
        this.totalToProcess = 0;
        this.processedCount = 0;
        this.totalEmailsFound = 0;
        this.allPlaylistsWithEmails = [];
        storageManager.clearPartialExportData();
    }
}

export const exportManager = new ExportManager();

// Make exportManager globally available for inline event handlers
window.exportManager = exportManager;