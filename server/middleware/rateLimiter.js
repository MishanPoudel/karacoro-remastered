const rateLimit = require('express-rate-limit');
const config = require('../config');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: config.rateLimit.message,
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  skip: (req) => {
    // Skip rate limiting in development for localhost
    if (config.isDevelopment && req.ip === '127.0.0.1') {
      return true;
    }
    return false;
  }
});

// Strict rate limiter for room creation
const roomCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 room creation requests per windowMs
  message: {
    error: 'Too many rooms created from this IP, please try again later.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 API requests per windowMs
  message: {
    error: 'Too many API requests from this IP, please try again later.',
    retryAfter: 60
  }
});

module.exports = {
  generalLimiter,
  roomCreationLimiter,
  apiLimiter
};