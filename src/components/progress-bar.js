/**
 * Progress bar component
 * Handles progress tracking and visual feedback
 */

import { uiManager } from '../modules/ui-manager.js';

class ProgressBar {
    constructor() {
        this.statusSection = null;
        this.progressBar = null;
        this.progressText = null;
        this.progressStats = null;
        this.initialized = false;
        this.isVisible = false;
    }

    /**
     * Initialize the progress bar component
     */
    initialize() {
        if (this.initialized) return;

        this.statusSection = document.getElementById('statusSection');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.progressStats = document.getElementById('progressStats');

        if (!this.statusSection || !this.progressBar) {
            console.error('Progress bar elements not found');
            return;
        }

        this.setupEventListeners();
        this.hide(); // Initially hidden
        this.initialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for progress events
        uiManager.addEventListener(document, 'progressUpdate', (e) => {
            this.updateProgress(e.detail);
        });

        // Listen for progress text updates
        uiManager.addEventListener(document, 'progressTextUpdate', (e) => {
            this.updateText(e.detail.text);
        });

        // Listen for progress show/hide events
        uiManager.addEventListener(document, 'progressShow', () => {
            this.show();
        });

        uiManager.addEventListener(document, 'progressHide', () => {
            this.hide();
        });
    }

    /**
     * Show the progress bar
     */
    show() {
        if (this.statusSection) {
            this.statusSection.style.display = 'block';
            this.isVisible = true;
        }
    }

    /**
     * Hide the progress bar
     */
    hide() {
        if (this.statusSection) {
            this.statusSection.style.display = 'none';
            this.isVisible = false;
        }
    }

    /**
     * Update progress bar
     * @param {Object} progress - Progress data object
     * @param {number} progress.processed - Number of items processed
     * @param {number} progress.total - Total number of items
     * @param {number} progress.emailsFound - Number of emails found
     * @param {string} progress.text - Optional progress text
     */
    updateProgress({ processed, total, emailsFound, text }) {
        const percentage = total > 0 ? Math.min((processed / total) * 100, 100) : 0;
        
        // Update progress bar width
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }

        // Update progress text
        if (text) {
            this.updateText(text);
        } else {
            this.updateText(`Processed: ${processed.toLocaleString()} / ${total.toLocaleString()}`);
        }

        // Update stats
        this.updateStats(emailsFound);

        // Show progress bar if not visible
        if (!this.isVisible) {
            this.show();
        }
    }

    /**
     * Update progress text
     * @param {string} text - Progress text
     */
    updateText(text) {
        if (this.progressText) {
            this.progressText.textContent = text;
        }
    }

    /**
     * Update progress stats
     * @param {number} emailsFound - Number of emails found
     * @param {string} additionalInfo - Additional info to display
     */
    updateStats(emailsFound, additionalInfo = '') {
        if (this.progressStats) {
            let statsText = `${emailsFound.toLocaleString()} emails found`;
            if (additionalInfo) {
                statsText += ` • ${additionalInfo}`;
            }
            this.progressStats.textContent = statsText;
        }
    }

    /**
     * Set progress to indeterminate state
     * @param {string} text - Text to display
     */
    setIndeterminate(text = 'Processing...') {
        if (this.progressBar) {
            this.progressBar.style.width = '100%';
            this.progressBar.classList.add('indeterminate');
        }
        this.updateText(text);
        this.show();
    }

    /**
     * Remove indeterminate state
     */
    removeIndeterminate() {
        if (this.progressBar) {
            this.progressBar.classList.remove('indeterminate');
        }
    }

    /**
     * Set progress to complete state
     * @param {string} text - Completion text
     * @param {number} emailsFound - Final email count
     */
    setComplete(text, emailsFound = 0) {
        if (this.progressBar) {
            this.progressBar.style.width = '100%';
            this.progressBar.classList.add('complete');
        }
        this.updateText(text);
        this.updateStats(emailsFound);
    }

    /**
     * Set progress to error state
     * @param {string} text - Error text
     */
    setError(text) {
        if (this.progressBar) {
            this.progressBar.classList.add('error');
        }
        this.updateText(text);
        this.show();
    }

    /**
     * Reset progress bar to initial state
     */
    reset() {
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
            this.progressBar.classList.remove('indeterminate', 'complete', 'error');
        }
        this.updateText('');
        this.updateStats(0);
        this.hide();
    }

    /**
     * Animate progress to a specific value
     * @param {number} targetPercentage - Target percentage (0-100)
     * @param {number} duration - Animation duration in milliseconds
     */
    animateToPercentage(targetPercentage, duration = 300) {
        if (!this.progressBar) return;

        const startPercentage = parseFloat(this.progressBar.style.width) || 0;
        const difference = targetPercentage - startPercentage;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentPercentage = startPercentage + (difference * easeOut);
            
            this.progressBar.style.width = `${currentPercentage}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Show progress with custom HTML content
     * @param {string} htmlContent - HTML content to display
     */
    showCustomContent(htmlContent) {
        if (this.progressText) {
            this.progressText.innerHTML = htmlContent;
        }
        this.show();
    }

    /**
     * Add a cancel button to the progress bar
     * @param {Function} onCancel - Callback function when cancel is clicked
     */
    addCancelButton(onCancel) {
        if (!this.progressText) return;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'cancel-btn';
        cancelButton.style.cssText = `
            margin-left: 10px;
            padding: 4px 12px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        
        cancelButton.addEventListener('click', () => {
            if (onCancel) onCancel();
            this.removeCancelButton();
        });

        this.progressText.appendChild(cancelButton);
    }

    /**
     * Remove cancel button
     */
    removeCancelButton() {
        const cancelBtn = this.progressText?.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.remove();
        }
    }

    /**
     * Set progress bar color
     * @param {string} color - CSS color value
     */
    setColor(color) {
        if (this.progressBar) {
            this.progressBar.style.backgroundColor = color;
        }
    }

    /**
     * Reset progress bar color to default
     */
    resetColor() {
        if (this.progressBar) {
            this.progressBar.style.backgroundColor = '';
        }
    }

    /**
     * Get current progress percentage
     * @returns {number} Current percentage (0-100)
     */
    getCurrentPercentage() {
        if (!this.progressBar) return 0;
        return parseFloat(this.progressBar.style.width) || 0;
    }

    /**
     * Check if progress bar is visible
     * @returns {boolean} True if visible
     */
    isProgressVisible() {
        return this.isVisible;
    }

    /**
     * Set progress with time estimate
     * @param {number} processed - Items processed
     * @param {number} total - Total items
     * @param {number} startTime - Start time in milliseconds
     */
    updateWithTimeEstimate(processed, total, startTime) {
        const percentage = total > 0 ? (processed / total) * 100 : 0;
        
        if (this.progressBar) {
            this.progressBar.style.width = `${percentage}%`;
        }

        // Calculate time estimate
        const elapsed = Date.now() - startTime;
        const rate = processed / elapsed; // items per millisecond
        const remaining = total - processed;
        const estimatedTimeLeft = remaining / rate;

        let timeText = '';
        if (processed > 0 && remaining > 0) {
            const minutes = Math.floor(estimatedTimeLeft / (1000 * 60));
            const seconds = Math.floor((estimatedTimeLeft % (1000 * 60)) / 1000);
            
            if (minutes > 0) {
                timeText = ` • ~${minutes}m ${seconds}s remaining`;
            } else if (seconds > 0) {
                timeText = ` • ~${seconds}s remaining`;
            }
        }

        this.updateText(`Processed: ${processed.toLocaleString()} / ${total.toLocaleString()}${timeText}`);
    }
}

export const progressBar = new ProgressBar();