/**
 * UI management module
 * Handles all DOM manipulation and UI state management
 */

class UIManager {
    constructor() {
        this.displayedPlaylistCount = 0;
        this.totalEmailsFound = 0;
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorContainer = document.getElementById('errorMessage');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    /**
     * Clear error message
     */
    clearError() {
        const errorContainer = document.getElementById('errorMessage');
        if (errorContainer) {
            errorContainer.innerHTML = '';
        }
    }

    /**
     * Setup UI for loading state
     * @param {string} text - Loading text to display
     */
    setupForLoading(text) {
        this.disableButtons(true);
        this.clearError();
        
        const statusSection = document.getElementById('statusSection');
        if (statusSection) {
            statusSection.style.display = 'block';
        }
        
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
        
        this.setupResultsTable();
        this.updateProgressText(text);
        this.updateProgress(0, 1, 0); // Reset progress bar
        this.totalEmailsFound = 0;
    }

    /**
     * Cleanup UI after loading
     * @param {string} text - Completion text to display
     * @param {boolean} keepProgressText - Whether to keep the progress text
     */
    cleanupAfterLoading(text, keepProgressText = false) {
        if (!keepProgressText) {
            this.updateProgressText(text);
        }
        this.disableButtons(false);
        
        const statusSection = document.getElementById('statusSection');
        if (statusSection) {
            statusSection.style.display = 'none';
        }
    }

    /**
     * Enable/disable UI buttons
     * @param {boolean} disabled - Whether to disable buttons
     */
    disableButtons(disabled) {
        const searchBtn = document.getElementById('searchBtn');
        const exportAllBtn = document.getElementById('exportAllBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (searchBtn) searchBtn.disabled = disabled;
        if (exportAllBtn) exportAllBtn.disabled = disabled;
        if (stopBtn) {
            stopBtn.style.display = disabled ? 'inline-block' : 'none';
        }
    }

    /**
     * Update progress bar and text
     * @param {number} processed - Number of items processed
     * @param {number} total - Total number of items
     * @param {number} emailsFound - Number of emails found
     */
    updateProgress(processed, total, emailsFound) {
        const percentage = total > 0 ? (processed / total) * 100 : 0;
        
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        this.updateProgressText(`Processed: ${processed.toLocaleString()} / ${total.toLocaleString()}`);
        
        const progressStats = document.getElementById('progressStats');
        if (progressStats) {
            progressStats.textContent = `${emailsFound.toLocaleString()} emails found`;
        }
    }

    /**
     * Update progress text
     * @param {string} message - Progress message
     */
    updateProgressText(message) {
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = message;
        }
    }

    /**
     * Setup results table structure
     * @returns {HTMLElement} Table body element
     */
    setupResultsTable() {
        const container = document.getElementById('resultsContainer');
        if (!container) return null;
        
        container.innerHTML = ''; // Clear previous content or placeholder
        const table = document.createElement('table');
        table.className = 'results-table';
        table.innerHTML = `
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
            <tbody></tbody>`;
        container.appendChild(table);
        this.displayedPlaylistCount = 0;
        return table.querySelector('tbody');
    }

    /**
     * Append playlist to results table
     * @param {Object} playlist - Playlist data object
     */
    appendPlaylistToTable(playlist) {
        const showAll = document.getElementById('showWithoutEmails')?.checked;
        if (!showAll && playlist.emails.length === 0) {
            return; // Skip if it has no email and we are not showing all
        }

        const tbody = document.querySelector('.results-table tbody');
        if (!tbody) return;

        const row = tbody.insertRow();
        row.innerHTML = `
            <td>
                ${playlist.image ? 
                    `<img src="${playlist.image}" alt="Cover" class="playlist-cover">` : 
                    '<div class="playlist-cover" style="background: #404040;"></div>'
                }
            </td>
            <td class="playlist-name">
                <a href="${playlist.url}" target="_blank">${this.escapeHtml(playlist.name)}</a>
            </td>
            <td>${this.escapeHtml(playlist.owner)}</td>
            <td class="emails">${playlist.emails.join(', ') || '-'}</td>
            <td>${playlist.followers.toLocaleString()}</td>
            <td class="description-preview" title="${this.escapeHtml(playlist.description)}">
                ${this.escapeHtml(playlist.description)}
            </td>
        `;
        this.displayedPlaylistCount++;
        this.updateResultsCount();
    }

    /**
     * Filter displayed results based on email presence
     * @param {boolean} showWithoutEmails - Whether to show playlists without emails
     */
    filterDisplayedResults(showWithoutEmails) {
        // This method needs access to the playlist data
        // In the modular architecture, this will be handled differently
        // For now, we'll emit an event that can be handled by the main application
        const event = new CustomEvent('filterResults', { 
            detail: { showWithoutEmails } 
        });
        document.dispatchEvent(event);
    }

    /**
     * Update results count display
     * @param {number} totalShown - Total playlists shown (optional)
     * @param {number} emailsFound - Total emails found (optional)
     */
    updateResultsCount(totalShown = null, emailsFound = null) {
        const resultsCount = document.getElementById('resultsCount');
        if (!resultsCount) return;

        let totalRows, emailsInView;
        
        if (totalShown !== null && emailsFound !== null) {
            totalRows = totalShown;
            emailsInView = emailsFound;
        } else {
            totalRows = document.querySelectorAll('.results-table tbody tr').length;
            const emailCells = document.querySelectorAll('.results-table .emails');
            emailsInView = Array.from(emailCells).filter(cell => 
                cell.textContent.trim() !== '-'
            ).length;
        }
        
        resultsCount.textContent = `Showing ${totalRows} playlists (${emailsInView} with emails)`;
    }

    /**
     * Update pagination controls
     * @param {number} currentPage - Current page number (1-indexed)
     * @param {number} totalPages - Total number of pages
     * @param {boolean} hasPrevious - Whether previous page exists
     * @param {boolean} hasNext - Whether next page exists
     */
    updatePaginationControls(currentPage, totalPages, hasPrevious, hasNext) {
        const pageInfo = document.getElementById('pageInfo');
        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        }
        
        const paginationDiv = document.getElementById('pagination');
        if (paginationDiv) {
            paginationDiv.style.display = totalPages > 1 ? 'flex' : 'none';
        }
        
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.disabled = !hasPrevious;
        if (nextBtn) nextBtn.disabled = !hasNext;
    }

    /**
     * Hide pagination controls
     */
    hidePagination() {
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    }

    /**
     * Show pagination controls
     */
    showPagination() {
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.style.display = 'flex';
        }
    }

    /**
     * Clear all results
     */
    clearResults() {
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.innerHTML = '<p class="placeholder-text">Enter your API credentials and perform a search to see results.</p>';
        }
        
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = 'No results yet';
        }
        
        this.hidePagination();
        this.displayedPlaylistCount = 0;
        this.totalEmailsFound = 0;
    }

    /**
     * Escape HTML characters to prevent XSS
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
     * Show placeholder message in results container
     * @param {string} message - Placeholder message
     */
    showPlaceholder(message) {
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.innerHTML = `<p class="placeholder-text">${message}</p>`;
        }
    }

    /**
     * Set status section visibility
     * @param {boolean} visible - Whether to show status section
     */
    setStatusSectionVisibility(visible) {
        const statusSection = document.getElementById('statusSection');
        if (statusSection) {
            statusSection.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Get form values
     * @returns {Object} Object containing form values
     */
    getFormValues() {
        return {
            clientId: document.getElementById('clientId')?.value.trim() || '',
            clientSecret: document.getElementById('clientSecret')?.value.trim() || '',
            searchQuery: document.getElementById('searchQuery')?.value.trim() || '',
            showWithoutEmails: document.getElementById('showWithoutEmails')?.checked || false
        };
    }

    /**
     * Set form values
     * @param {Object} values - Object containing form values
     */
    setFormValues(values) {
        if (values.clientId) {
            const clientIdInput = document.getElementById('clientId');
            if (clientIdInput) clientIdInput.value = values.clientId;
        }
        
        if (values.clientSecret) {
            const clientSecretInput = document.getElementById('clientSecret');
            if (clientSecretInput) clientSecretInput.value = values.clientSecret;
        }
        
        if (values.searchQuery) {
            const searchInput = document.getElementById('searchQuery');
            if (searchInput) searchInput.value = values.searchQuery;
        }
        
        if (values.showWithoutEmails !== undefined) {
            const checkbox = document.getElementById('showWithoutEmails');
            if (checkbox) checkbox.checked = values.showWithoutEmails;
        }
    }

    /**
     * Add event listener with error handling
     * @param {HTMLElement|string} element - Element or element ID
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     */
    addEventListener(element, eventType, handler) {
        const el = typeof element === 'string' ? document.getElementById(element) : element;
        if (el) {
            el.addEventListener(eventType, (event) => {
                try {
                    handler(event);
                } catch (error) {
                    console.error(`Error in ${eventType} handler:`, error);
                    this.showError(`An error occurred: ${error.message}`);
                }
            });
        }
    }

    /**
     * Initialize UI manager
     */
    initialize() {
        this.clearResults();
        this.clearError();
        this.setStatusSectionVisibility(false);
    }

    /**
     * Create confirmation dialog
     * @param {string} message - Confirmation message
     * @returns {boolean} User's choice
     */
    confirm(message) {
        return window.confirm(message);
    }

    /**
     * Show temporary success message
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     */
    showSuccessMessage(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1db954;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, duration);
    }
}

export const uiManager = new UIManager();