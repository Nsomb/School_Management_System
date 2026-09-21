/**
 * Extract client IP address from Express request.
 * Handles proxy headers for production deployments.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
}

/**
 * Extract user agent from request.
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || null;
}

module.exports = {
  getClientIp,
  getUserAgent
};