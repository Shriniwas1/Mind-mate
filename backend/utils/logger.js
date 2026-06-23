const crypto = require('crypto');

const logger = {
  info: (message, meta = {}) => {
    logger.log('info', message, meta);
  },
  warn: (message, meta = {}) => {
    logger.log('warn', message, meta);
  },
  error: (message, meta = {}) => {
    logger.log('error', message, meta);
  },
  log: (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    // Do not log secrets, passwords, or tokens
    const cleanMeta = { ...meta };
    delete cleanMeta.password;
    delete cleanMeta.token;
    delete cleanMeta.secret;
    delete cleanMeta.authorization;

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        timestamp,
        level,
        message,
        ...cleanMeta
      }));
    } else {
      const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[32m';
      const reset = '\x1b[0m';
      const metaStr = Object.keys(cleanMeta).length ? ` | ${JSON.stringify(cleanMeta)}` : '';
      console.log(`[${timestamp}] ${color}${level.toUpperCase()}${reset}: ${message}${metaStr}`);
    }
  }
};

module.exports = logger;
