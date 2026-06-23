const crypto = require('crypto');
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();

  req.requestId = requestId;
  req.traceId = traceId;
  req.correlationId = correlationId;

  res.setHeader('x-request-id', requestId);

  // Attach request-specific logger
  req.logger = {
    info: (msg, meta = {}) => logger.info(msg, { requestId, traceId, correlationId, userId: req.userId, ...meta }),
    warn: (msg, meta = {}) => logger.warn(msg, { requestId, traceId, correlationId, userId: req.userId, ...meta }),
    error: (msg, meta = {}) => logger.error(msg, { requestId, traceId, correlationId, userId: req.userId, ...meta })
  };

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration
    });
  });

  next();
};

module.exports = requestLogger;
