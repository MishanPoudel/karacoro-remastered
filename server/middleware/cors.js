const cors = require('cors');
const config = require('../config');

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // In development, allow all origins
    if (config.isDevelopment) {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list for production
    if (config.cors.origin.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject other origins in production
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
});

module.exports = corsMiddleware;