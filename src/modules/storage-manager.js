/**
 * Storage management module
 * Handles session storage, caching, and data persistence
 */

class StorageManager {
    constructor() {
        this.playlistCache = new Map();
        this.sessionStorageKeys = {
            CLIENT_ID: 'spotify_client_id',
            CLIENT_SECRET: 'spotify_client_secret',
            LAST_SEARCH_QUERY: 'last_search_query'
        };
    }

    /**
     * Save API credentials to session storage
     * @param {string} clientId - Spotify Client ID
     * @param {string} clientSecret - Spotify Client Secret
     */
    saveCredentials(clientId, clientSecret) {
        if (clientId) {
            sessionStorage.setItem(this.sessionStorageKeys.CLIENT_ID, clientId);
        }
        if (clientSecret) {
            sessionStorage.setItem(this.sessionStorageKeys.CLIENT_SECRET, clientSecret);
        }
    }

    /**
     * Load API credentials from session storage
     * @returns {Object} Object containing clientId and clientSecret
     */
    loadCredentials() {
        return {
            clientId: sessionStorage.getItem(this.sessionStorageKeys.CLIENT_ID) || '',
            clientSecret: sessionStorage.getItem(this.sessionStorageKeys.CLIENT_SECRET) || ''
        };
    }

    /**
     * Clear stored credentials
     */
    clearCredentials() {
        sessionStorage.removeItem(this.sessionStorageKeys.CLIENT_ID);
        sessionStorage.removeItem(this.sessionStorageKeys.CLIENT_SECRET);
    }

    /**
     * Save last search query
     * @param {string} query - Search query to save
     */
    saveLastSearchQuery(query) {
        if (query) {
            sessionStorage.setItem(this.sessionStorageKeys.LAST_SEARCH_QUERY, query);
        }
    }

    /**
     * Load last search query
     * @returns {string} Last search query or empty string
     */
    loadLastSearchQuery() {
        return sessionStorage.getItem(this.sessionStorageKeys.LAST_SEARCH_QUERY) || '';
    }

    /**
     * Clear last search query
     */
    clearLastSearchQuery() {
        sessionStorage.removeItem(this.sessionStorageKeys.LAST_SEARCH_QUERY);
    }

    /**
     * Add playlist to cache
     * @param {string} playlistId - Spotify playlist ID
     * @param {Object} playlistData - Playlist data object
     */
    cachePlaylist(playlistId, playlistData) {
        this.playlistCache.set(playlistId, playlistData);
    }

    /**
     * Get playlist from cache
     * @param {string} playlistId - Spotify playlist ID
     * @returns {Object|null} Cached playlist data or null
     */
    getCachedPlaylist(playlistId) {
        return this.playlistCache.get(playlistId) || null;
    }

    /**
     * Check if playlist is cached
     * @param {string} playlistId - Spotify playlist ID
     * @returns {boolean} True if playlist is cached
     */
    hasPlaylistInCache(playlistId) {
        return this.playlistCache.has(playlistId);
    }

    /**
     * Clear playlist cache
     */
    clearPlaylistCache() {
        this.playlistCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            playlistCount: this.playlistCache.size,
            memoryUsage: this.getApproximateMemoryUsage()
        };
    }

    /**
     * Get approximate memory usage of cache
     * @returns {number} Approximate memory usage in bytes
     */
    getApproximateMemoryUsage() {
        let totalSize = 0;
        for (const [key, value] of this.playlistCache.entries()) {
            totalSize += JSON.stringify(key).length;
            totalSize += JSON.stringify(value).length;
        }
        return totalSize;
    }

    /**
     * Export data to JSON file
     * @param {Array} data - Data to export
     * @param {string} filename - Filename for the export
     */
    exportData(data, filename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `spotify-playlist-export-${timestamp}.json`;
        const finalFilename = filename || defaultFilename;
        
        const jsonData = JSON.stringify(data, null, 2);
        this.downloadFile(jsonData, finalFilename, 'application/json');
    }

    /**
     * Download file to browser
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} contentType - MIME type
     */
    downloadFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Store partial export data
     * @param {Array} data - Partial export data
     */
    storePartialExportData(data) {
        window.partialExportData = data;
    }

    /**
     * Get partial export data
     * @returns {Array|null} Partial export data or null
     */
    getPartialExportData() {
        return window.partialExportData || null;
    }

    /**
     * Clear partial export data
     */
    clearPartialExportData() {
        delete window.partialExportData;
    }

    /**
     * Get all session storage data
     * @returns {Object} All session storage data
     */
    getAllSessionData() {
        const data = {};
        for (const key of Object.values(this.sessionStorageKeys)) {
            const value = sessionStorage.getItem(key);
            if (value) {
                data[key] = value;
            }
        }
        return data;
    }

    /**
     * Clear all stored data
     */
    clearAllData() {
        this.clearCredentials();
        this.clearLastSearchQuery();
        this.clearPlaylistCache();
        this.clearPartialExportData();
    }

    /**
     * Initialize storage manager and load saved data
     */
    initialize() {
        // Load saved credentials if available
        const credentials = this.loadCredentials();
        if (credentials.clientId) {
            const clientIdInput = document.getElementById('clientId');
            if (clientIdInput) {
                clientIdInput.value = credentials.clientId;
            }
        }
        if (credentials.clientSecret) {
            const clientSecretInput = document.getElementById('clientSecret');
            if (clientSecretInput) {
                clientSecretInput.value = credentials.clientSecret;
            }
        }

        // Load last search query
        const lastQuery = this.loadLastSearchQuery();
        if (lastQuery) {
            const searchInput = document.getElementById('searchQuery');
            if (searchInput) {
                searchInput.value = lastQuery;
            }
        }
    }
}

export const storageManager = new StorageManager();