/**
 * Middleware to attach client IP and user agent to req.audit.
 * Used by controllers to easily pass context to audit logger.
 */
function auditContext(req, res, next) {
  req.audit = {
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null
  };
  next();
}

module.exports = auditContext;