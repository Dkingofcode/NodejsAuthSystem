/**
 * SQL Sanitization Middleware
 * Prevents SQL injection attacks for PostgreSQL
 */

/**
 * Sanitize input by removing potentially dangerous SQL characters
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove common SQL injection patterns
  const dangerous = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--[^\n]*)/g,  // SQL comments
    /(\/\*[\s\S]*?\*\/)/g,  // Multi-line comments
    /(['";])/g,  // Quotes and semicolons in suspicious contexts
  ];
  
  let sanitized = input;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
};

/**
 * Recursively sanitize object properties
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Don't sanitize password fields or tokens
        if (['password', 'token', 'refreshToken', 'accessToken'].includes(key)) {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  return obj;
};

/**
 * Express middleware to sanitize request data
 */
export default function sqlSanitize (req, res, next)  {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query params
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

//module.exports = { sqlSanitize, sanitizeInput, sanitizeObject };