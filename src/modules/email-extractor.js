/**
 * Email extraction module
 * Handles email parsing, validation, and formatting
 */

class EmailExtractor {
    constructor() {
        // Email regex pattern from the original implementation
        this.emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        
        // More comprehensive email regex for strict validation
        this.strictEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    }

    /**
     * Extract emails from text using the primary regex
     * @param {string} text - Text to extract emails from
     * @returns {Array<string>} Array of extracted emails
     */
    extractEmails(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const matches = text.match(this.emailRegex) || [];
        return matches;
    }

    /**
     * Extract and deduplicate emails from text
     * @param {string} text - Text to extract emails from
     * @returns {Array<string>} Array of unique emails
     */
    extractUniqueEmails(text) {
        const emails = this.extractEmails(text);
        return [...new Set(emails)];
    }

    /**
     * Validate a single email address
     * @param {string} email - Email address to validate
     * @returns {boolean} True if email is valid
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }

        return this.strictEmailRegex.test(email);
    }

    /**
     * Filter valid emails from an array
     * @param {Array<string>} emails - Array of email addresses
     * @returns {Array<string>} Array of valid emails
     */
    filterValidEmails(emails) {
        if (!Array.isArray(emails)) {
            return [];
        }

        return emails.filter(email => this.isValidEmail(email));
    }

    /**
     * Extract and validate emails from text
     * @param {string} text - Text to extract emails from
     * @returns {Array<string>} Array of valid, unique emails
     */
    extractValidEmails(text) {
        const emails = this.extractUniqueEmails(text);
        return this.filterValidEmails(emails);
    }

    /**
     * Get email domains from an array of emails
     * @param {Array<string>} emails - Array of email addresses
     * @returns {Array<string>} Array of unique domains
     */
    getEmailDomains(emails) {
        if (!Array.isArray(emails)) {
            return [];
        }

        const domains = emails
            .filter(email => this.isValidEmail(email))
            .map(email => email.split('@')[1])
            .filter(domain => domain);

        return [...new Set(domains)];
    }

    /**
     * Group emails by domain
     * @param {Array<string>} emails - Array of email addresses
     * @returns {Object} Object with domains as keys and arrays of emails as values
     */
    groupEmailsByDomain(emails) {
        if (!Array.isArray(emails)) {
            return {};
        }

        const grouped = {};
        
        emails.forEach(email => {
            if (this.isValidEmail(email)) {
                const domain = email.split('@')[1];
                if (!grouped[domain]) {
                    grouped[domain] = [];
                }
                grouped[domain].push(email);
            }
        });

        return grouped;
    }

    /**
     * Get email statistics
     * @param {Array<string>} emails - Array of email addresses
     * @returns {Object} Statistics object
     */
    getEmailStats(emails) {
        if (!Array.isArray(emails)) {
            return {
                total: 0,
                valid: 0,
                invalid: 0,
                unique: 0,
                domains: 0
            };
        }

        const validEmails = this.filterValidEmails(emails);
        const uniqueEmails = [...new Set(emails)];
        const domains = this.getEmailDomains(emails);

        return {
            total: emails.length,
            valid: validEmails.length,
            invalid: emails.length - validEmails.length,
            unique: uniqueEmails.length,
            domains: domains.length
        };
    }

    /**
     * Format emails for display
     * @param {Array<string>} emails - Array of email addresses
     * @param {string} separator - Separator between emails
     * @returns {string} Formatted email string
     */
    formatEmailsForDisplay(emails, separator = ', ') {
        if (!Array.isArray(emails) || emails.length === 0) {
            return '';
        }

        return emails.join(separator);
    }

    /**
     * Clean email addresses (remove whitespace, lowercase)
     * @param {Array<string>} emails - Array of email addresses
     * @returns {Array<string>} Array of cleaned emails
     */
    cleanEmails(emails) {
        if (!Array.isArray(emails)) {
            return [];
        }

        return emails
            .map(email => email.trim().toLowerCase())
            .filter(email => email.length > 0);
    }

    /**
     * Extract emails from playlist description with metadata
     * @param {string} description - Playlist description
     * @returns {Object} Object with emails and metadata
     */
    extractEmailsWithMetadata(description) {
        const rawEmails = this.extractEmails(description);
        const cleanedEmails = this.cleanEmails(rawEmails);
        const uniqueEmails = [...new Set(cleanedEmails)];
        const validEmails = this.filterValidEmails(uniqueEmails);
        const domains = this.getEmailDomains(validEmails);
        const stats = this.getEmailStats(rawEmails);

        return {
            raw: rawEmails,
            cleaned: cleanedEmails,
            unique: uniqueEmails,
            valid: validEmails,
            domains: domains,
            stats: stats,
            formatted: this.formatEmailsForDisplay(validEmails)
        };
    }

    /**
     * Check if text contains any email addresses
     * @param {string} text - Text to check
     * @returns {boolean} True if text contains emails
     */
    hasEmails(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        return this.emailRegex.test(text);
    }

    /**
     * Get the regex pattern being used
     * @returns {RegExp} The email regex pattern
     */
    getRegexPattern() {
        return this.emailRegex;
    }

    /**
     * Update the regex pattern
     * @param {RegExp} newPattern - New regex pattern to use
     */
    setRegexPattern(newPattern) {
        if (newPattern instanceof RegExp) {
            this.emailRegex = newPattern;
        } else {
            throw new Error('Pattern must be a RegExp object');
        }
    }
}

export const emailExtractor = new EmailExtractor();

/**
 * Convenience function for extracting emails
 * @param {string} text - Text to extract emails from
 * @returns {Array<string>} Array of unique emails
 */
export function extractEmails(text) {
    return emailExtractor.extractUniqueEmails(text);
}

/**
 * Convenience function for extracting valid emails
 * @param {string} text - Text to extract emails from
 * @returns {Array<string>} Array of valid, unique emails
 */
export function extractValidEmails(text) {
    return emailExtractor.extractValidEmails(text);
}