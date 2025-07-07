/**
 * Results table component
 * Handles results display, filtering, and pagination
 */

import { searchManager } from '../modules/search-manager.js';
import { exportManager } from '../modules/export-manager.js';
import { storageManager } from '../modules/storage-manager.js';
import { uiManager } from '../modules/ui-manager.js';

class ResultsTable {
    constructor() {
        this.tableContainer = null;
        this.table = null;
        this.tbody = null;
        this.resultsCount = null;
        this.showWithoutEmailsCheckbox = null;
        this.paginationContainer = null;
        this.currentPlaylists = [];
        this.initialized = false;
    }

    /**
     * Initialize the results table
     */
    initialize() {
        if (this.initialized) return;

        this.tableContainer = document.getElementById('resultsContainer');
        this.resultsCount = document.getElementById('resultsCount');
        this.showWithoutEmailsCheckbox = document.getElementById('showWithoutEmails');
        this.paginationContainer = document.getElementById('pagination');

        if (!this.tableContainer) {
            console.error('Results container not found');
            return;
        }

        this.setupEventListeners();
        this.setupInitialState();
        this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter checkbox change
        if (this.showWithoutEmailsCheckbox) {
            uiManager.addEventListener(this.showWithoutEmailsCheckbox, 'change', (e) => {
                this.handleFilterChange(e.target.checked);
            });
        }

        // Pagination buttons
        uiManager.addEventListener('prevBtn', 'click', () => {
            this.goToPreviousPage();
        });

        uiManager.addEventListener('nextBtn', 'click', () => {
            this.goToNextPage();
        });

        // Export current page
        uiManager.addEventListener(document, 'click', (e) => {
            if (e.target.id === 'exportCurrentPage') {
                this.exportCurrentPage();
            }
        });

        // Clear results
        uiManager.addEventListener(document, 'click', (e) => {
            if (e.target.id === 'clearResults') {
                this.clearResults();
            }
        });
    }

    /**
     * Setup initial state
     */
    setupInitialState() {
        this.showPlaceholder('Enter your API credentials and perform a search to see results.');
    }

    /**
     * Create and setup the results table structure
     * @returns {HTMLElement} Table body element
     */
    setupTable() {
        if (!this.tableContainer) return null;

        // Clear container
        this.tableContainer.innerHTML = '';

        // Create table
        this.table = document.createElement('table');
        this.table.className = 'results-table';
        this.table.innerHTML = `
            <thead>
                <tr>
                    <th>Cover</th>
                    <th>Playlist Name</th>
                    <th>Owner</th>
                    <th>Emails</th>
                    <th>Followers</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        this.tbody = this.table.querySelector('tbody');
        this.tableContainer.appendChild(this.table);

        return this.tbody;
    }

    /**
     * Add playlist to the table
     * @param {Object} playlist - Playlist data object
     */
    addPlaylist(playlist) {
        if (!this.tbody) {
            this.setupTable();
        }

        const showAll = this.showWithoutEmailsCheckbox?.checked || false;
        if (!showAll && playlist.emails.length === 0) {
            return; // Skip if it has no email and we are not showing all
        }

        const row = this.tbody.insertRow();
        row.innerHTML = `
            <td>
                ${playlist.image ? 
                    `<img src="${playlist.image}" alt="Cover" class="playlist-cover">` : 
                    '<div class="playlist-cover" style="background: #404040;"></div>'
                }
            </td>
            <td class="playlist-name">
                <a href="${playlist.url}" target="_blank" rel="noopener noreferrer">
                    ${this.escapeHtml(playlist.name)}
                </a>
            </td>
            <td>${this.escapeHtml(playlist.owner)}</td>
            <td class="emails">${this.formatEmails(playlist.emails)}</td>
            <td>${playlist.followers.toLocaleString()}</td>
            <td class="description-preview" title="${this.escapeHtml(playlist.description)}">
                ${this.escapeHtml(playlist.description)}
            </td>
        `;

        // Store playlist data on the row for easy access
        row.dataset.playlistId = playlist.id;
        row.dataset.hasEmails = playlist.emails.length > 0 ? 'true' : 'false';
    }

    /**
     * Update results with new playlist data
     * @param {Array} playlists - Array of playlist objects
     */
    updateResults(playlists) {
        this.currentPlaylists = playlists || [];
        this.setupTable();

        if (this.currentPlaylists.length === 0) {
            this.showPlaceholder('No playlists found for this search.');
            return;
        }

        // Add each playlist to the table
        this.currentPlaylists.forEach(playlist => {
            this.addPlaylist(playlist);
        });

        this.updateResultsCount();
    }

    /**
     * Filter current results based on email presence
     * @param {boolean} showWithoutEmails - Whether to show playlists without emails
     */
    handleFilterChange(showWithoutEmails) {
        if (!this.tbody || this.currentPlaylists.length === 0) return;

        // Clear and rebuild table with current filter
        this.setupTable();
        
        let displayedCount = 0;
        this.currentPlaylists.forEach(playlist => {
            if (showWithoutEmails || playlist.emails.length > 0) {
                this.addPlaylist(playlist);
                displayedCount++;
            }
        });

        if (displayedCount === 0 && !showWithoutEmails) {
            this.showPlaceholder('No playlists with emails on this page. Toggle the checkbox above to see all.');
        }

        this.updateResultsCount();
    }

    /**
     * Update results count display
     */
    updateResultsCount() {
        if (!this.resultsCount) return;

        const totalRows = this.tbody?.querySelectorAll('tr').length || 0;
        const emailRows = this.tbody?.querySelectorAll('tr[data-has-emails="true"]').length || 0;

        this.resultsCount.textContent = `Showing ${totalRows} playlists (${emailRows} with emails)`;
    }

    /**
     * Show placeholder message
     * @param {string} message - Placeholder message
     */
    showPlaceholder(message) {
        if (this.tableContainer) {
            this.tableContainer.innerHTML = `<p class="placeholder-text">${message}</p>`;
        }
    }

    /**
     * Clear all results
     */
    clearResults() {
        this.currentPlaylists = [];
        this.showPlaceholder('Enter your API credentials and perform a search to see results.');
        this.updateResultsCount();
        this.hidePagination();
    }

    /**
     * Export current page results
     */
    exportCurrentPage() {
        const playlistsWithEmails = this.currentPlaylists.filter(p => p.emails.length > 0);
        
        if (playlistsWithEmails.length === 0) {
            uiManager.showError('No playlists with emails found on current page');
            return;
        }

        exportManager.exportCurrentPage(playlistsWithEmails);
    }

    /**
     * Go to previous page
     */
    async goToPreviousPage() {
        await searchManager.goToPreviousPage();
    }

    /**
     * Go to next page
     */
    async goToNextPage() {
        await searchManager.goToNextPage();
    }

    /**
     * Update pagination controls
     * @param {number} currentPage - Current page (1-indexed)
     * @param {number} totalPages - Total pages
     * @param {boolean} hasPrevious - Has previous page
     * @param {boolean} hasNext - Has next page
     */
    updatePagination(currentPage, totalPages, hasPrevious, hasNext) {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.disabled = !hasPrevious;
        if (nextBtn) nextBtn.disabled = !hasNext;

        // Show/hide pagination
        if (this.paginationContainer) {
            this.paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    /**
     * Hide pagination controls
     */
    hidePagination() {
        if (this.paginationContainer) {
            this.paginationContainer.style.display = 'none';
        }
    }

    /**
     * Show pagination controls
     */
    showPagination() {
        if (this.paginationContainer) {
            this.paginationContainer.style.display = 'flex';
        }
    }

    /**
     * Format emails for display
     * @param {Array} emails - Array of email addresses
     * @returns {string} Formatted email string
     */
    formatEmails(emails) {
        if (!emails || emails.length === 0) {
            return '-';
        }
        return emails.join(', ');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get table statistics
     * @returns {Object} Table statistics
     */
    getStatistics() {
        const totalPlaylists = this.currentPlaylists.length;
        const playlistsWithEmails = this.currentPlaylists.filter(p => p.emails.length > 0).length;
        const totalEmails = this.currentPlaylists.reduce((sum, p) => sum + p.emails.length, 0);
        
        return {
            totalPlaylists,
            playlistsWithEmails,
            playlistsWithoutEmails: totalPlaylists - playlistsWithEmails,
            totalEmails,
            averageEmailsPerPlaylist: totalPlaylists > 0 ? (totalEmails / totalPlaylists).toFixed(2) : 0
        };
    }

    /**
     * Sort table by column
     * @param {string} column - Column to sort by
     * @param {boolean} ascending - Sort direction
     */
    sortBy(column, ascending = true) {
        if (!this.currentPlaylists || this.currentPlaylists.length === 0) return;

        this.currentPlaylists.sort((a, b) => {
            let valueA, valueB;
            
            switch (column) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'owner':
                    valueA = a.owner.toLowerCase();
                    valueB = b.owner.toLowerCase();
                    break;
                case 'emails':
                    valueA = a.emails.length;
                    valueB = b.emails.length;
                    break;
                case 'followers':
                    valueA = a.followers;
                    valueB = b.followers;
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return ascending ? -1 : 1;
            if (valueA > valueB) return ascending ? 1 : -1;
            return 0;
        });

        // Refresh the table with sorted data
        this.updateResults(this.currentPlaylists);
    }

    /**
     * Search within current results
     * @param {string} searchTerm - Term to search for
     * @returns {Array} Filtered playlists
     */
    searchInResults(searchTerm) {
        if (!searchTerm || !this.currentPlaylists) return this.currentPlaylists;

        const term = searchTerm.toLowerCase();
        return this.currentPlaylists.filter(playlist => 
            playlist.name.toLowerCase().includes(term) ||
            playlist.owner.toLowerCase().includes(term) ||
            playlist.description.toLowerCase().includes(term) ||
            playlist.emails.some(email => email.toLowerCase().includes(term))
        );
    }

    /**
     * Get currently displayed playlists
     * @returns {Array} Array of currently displayed playlists
     */
    getCurrentPlaylists() {
        return this.currentPlaylists;
    }

    /**
     * Get playlists with emails
     * @returns {Array} Array of playlists that have emails
     */
    getPlaylistsWithEmails() {
        return this.currentPlaylists.filter(p => p.emails.length > 0);
    }

    /**
     * Reset table to initial state
     */
    reset() {
        this.currentPlaylists = [];
        this.setupInitialState();
        this.hidePagination();
        
        if (this.showWithoutEmailsCheckbox) {
            this.showWithoutEmailsCheckbox.checked = false;
        }
    }
}

export const resultsTable = new ResultsTable();