// backend/utils/helpers.js
/**
 * Wraps an async request handler to catch errors and send consistent JSON responses.
 * @param {Object} res - Express response object
 * @param {Function} callback - Async function that returns the response data
 */
exports.handleRequest = async (res, callback) => {
    try {
        const result = await callback();
        res.status(200).json(result);
    } catch (error) {
        console.error('Request error:', error);
        res.status(400).json({ error: error.message || 'An error occurred' });
    }
};