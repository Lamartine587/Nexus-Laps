const logger = require('./logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Skip logging for these paths to reduce noise
  const excludedPaths = ['/api/health', '/favicon.ico'];
  if (excludedPaths.includes(req.path)) {
    return next();
  }

  // Log the request
  logger.log(req, 'request_received', `${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' ? 
          (req.body && Object.keys(req.body).length > 0 ? '[DATA_HIDDEN]' : undefined) : undefined
  }, 'low');

  // Store the original end method
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log the response
    const severity = res.statusCode >= 400 ? 'medium' : 'low';
    logger.log(req, 'request_completed', `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: duration,
      responseSize: chunk ? chunk.length : 0
    }, severity);

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;