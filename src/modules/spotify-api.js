/**
 * Spotify API module
 * Handles authentication, rate limiting, and API calls
 */

import { classifyError } from './error-handler.js';
import { storageManager } from './storage-manager.js';
import { uiManager } from './ui-manager.js';

class SpotifyAPI {
    constructor() {
        this.accessToken = null;
        this.tokenRefreshInProgress = false;
        this.currentAbortController = null;
    }

    /**
     * Creates a timeout signal combined with optional abort controller
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {AbortSignal} Combined signal
     */
    createTimeoutSignal(timeoutMs = 30000) {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        return this.currentAbortController 
            ? AbortSignal.any([this.currentAbortController.signal, timeoutSignal])
            : timeoutSignal;
    }

    /**
     * Sets the current abort controller for stopping operations
     * @param {AbortController} controller - The abort controller
     */
    setAbortController(controller) {
        this.currentAbortController = controller;
    }

    /**
     * Get access token using Client Credentials flow
     * @param {string} clientId - Spotify Client ID
     * @param {string} clientSecret - Spotify Client Secret
     * @returns {Promise<string|null>} Access token or null if failed
     */
    async getAccessToken(clientId, clientSecret) {
        if (!clientId || !clientSecret) {
            uiManager.showError('Please enter both Client ID and Client Secret');
            return null;
        }

        const authString = btoa(`${clientId}:${clientSecret}`);
        try {
            const signal = this.createTimeoutSignal();
                
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials',
                signal
            });

            if (!response.ok) {
                let errorMessage = '';
                try {
                    const errorData = await response.json();
                    switch (response.status) {
                        case 400:
                            if (errorData.error === 'invalid_client') {
                                errorMessage = 'Invalid Client ID or Client Secret. Please check your credentials.';
                            } else if (errorData.error === 'invalid_grant') {
                                errorMessage = 'Invalid grant type. This shouldn\'t happen - please refresh the page.';
                            } else {
                                errorMessage = `Authentication failed: ${errorData.error_description || errorData.error || 'Bad request'}`;
                            }
                            break;
                        case 429:
                            await this.handleRateLimit(response, 'authentication');
                            // Retry the authentication after rate limit wait
                            return await this.getAccessToken(clientId, clientSecret);
                        case 500:
                        case 502:
                        case 503:
                            errorMessage = 'Spotify servers are experiencing issues. Please try again in a few minutes.';
                            break;
                        default:
                            errorMessage = `Authentication failed: ${response.status} ${response.statusText}`;
                    }
                } catch (parseError) {
                    errorMessage = `Authentication failed: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            return this.accessToken;
        } catch (error) {
            const errorInfo = classifyError(error, 'Authentication request');
            if (errorInfo.type === 'user_abort') {
                return null;
            } else if (errorInfo.message) {
                uiManager.showError(errorInfo.message);
            }
            return null;
        }
    }

    /**
     * Rate limiting handler with countdown timer
     * @param {Response} response - HTTP response object
     * @param {string} operation - Name of the operation being rate limited
     */
    async handleRateLimit(response, operation = 'API request') {
        const retryAfter = response.headers.get('Retry-After');
        if (!retryAfter) {
            throw new Error('Rate limited. Please wait a moment before trying again.');
        }
        
        const waitSeconds = parseInt(retryAfter) + 1; // Add 1 second buffer as recommended
        uiManager.updateProgressText(`Rate limited. Waiting ${waitSeconds} seconds...`);
        
        let remainingTime = waitSeconds;
        const countdownInterval = setInterval(() => {
            remainingTime--;
            if (remainingTime > 0) {
                uiManager.updateProgressText(`Rate limited. Retrying ${operation} in ${remainingTime} seconds...`);
            } else {
                clearInterval(countdownInterval);
                uiManager.updateProgressText(`Retrying ${operation}...`);
            }
        }, 1000);
        
        // Wait for the specified time
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        clearInterval(countdownInterval);
    }

    /**
     * Search for playlists
     * @param {string} query - Search query
     * @param {number} limit - Number of results to return
     * @param {number} offset - Offset for pagination
     * @returns {Promise<Object|null>} Search results or null if failed
     */
    async searchPlaylists(query, limit = 50, offset = 0) {
        if (!this.accessToken) {
            throw new Error('Access token not available. Please authenticate first.');
        }

        try {
            const signal = this.createTimeoutSignal();
            
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=${limit}&offset=${offset}`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
                signal
            });

            if (!response.ok) {
                switch (response.status) {
                    case 401:
                        this.accessToken = null;
                        throw new Error('Authentication expired. Please re-authenticate.');
                    case 403:
                        throw new Error('Access denied. Your app may not have permission to search playlists.');
                    case 429:
                        await this.handleRateLimit(response, 'search');
                        return await this.searchPlaylists(query, limit, offset); // Retry
                    case 400:
                        throw new Error('Invalid search query. Please check your search terms.');
                    case 500:
                    case 502:
                    case 503:
                        throw new Error('Spotify servers are experiencing issues. Please try again in a few minutes.');
                    default:
                        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
                }
            }

            return await response.json();
        } catch (error) {
            const errorInfo = classifyError(error, 'Search');
            if (errorInfo.type === 'user_abort') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get detailed playlist information
     * @param {string} playlistId - Spotify playlist ID
     * @returns {Promise<Object|null>} Playlist data or null if failed
     */
    async getDetailedPlaylist(playlistId) {
        if (storageManager.playlistCache.has(playlistId)) {
            return storageManager.playlistCache.get(playlistId);
        }
        
        try {
            const signal = this.createTimeoutSignal();
                
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` },
                signal
            });
            
            if (!response.ok) {
                switch (response.status) {
                    case 401:
                        // Token expired - refresh and retry
                        if (!this.tokenRefreshInProgress) {
                            this.tokenRefreshInProgress = true;
                            this.accessToken = null;
                            // Note: In the new architecture, we'll need to handle token refresh differently
                            // This will require access to the credentials
                            this.tokenRefreshInProgress = false;
                            throw new Error('Authentication expired. Please re-authenticate.');
                        }
                        return null;
                    case 403:
                        // Private playlist or access denied - silently skip
                        console.log(`Access denied for playlist ${playlistId}`);
                        return null;
                    case 404:
                        // Playlist doesn't exist or was deleted - silently skip
                        console.log(`Playlist ${playlistId} not found`);
                        return null;
                    case 429:
                        await this.handleRateLimit(response, `playlist ${playlistId}`);
                        return await this.getDetailedPlaylist(playlistId); // Retry
                    case 500:
                    case 502:
                    case 503:
                        // Server errors - silently skip this playlist but log it
                        console.log(`Server error for playlist ${playlistId}: ${response.status}`);
                        return null;
                    default:
                        console.log(`Error fetching playlist ${playlistId}: ${response.status}`);
                        return null;
                }
            }

            const data = await response.json();
            const description = data.description || '';
            
            // Extract emails from description
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
            const emails = description.match(emailRegex) || [];
            const uniqueEmails = [...new Set(emails)];

            const playlistData = {
                id: data.id,
                name: data.name,
                owner: data.owner.display_name || data.owner.id,
                description: description,
                emails: uniqueEmails,
                followers: data.followers ? data.followers.total : 0,
                url: data.external_urls.spotify,
                image: data.images && data.images.length > 0 ? data.images[0].url : null
            };
            
            storageManager.playlistCache.set(playlistId, playlistData);
            return playlistData;
        } catch (error) {
            const errorInfo = classifyError(error, `playlist ${playlistId}`);
            if (errorInfo.type === 'user_abort') {
                return null;
            } else if (errorInfo.type === 'other') {
                console.error(`Error fetching playlist ${playlistId}:`, error);
            } else if (errorInfo.message) {
                console.log(errorInfo.message);
            }
            return null;
        }
    }
}

export const spotifyAPI = new SpotifyAPI();