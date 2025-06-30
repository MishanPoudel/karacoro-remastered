const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Room validation rules
const validateRoomCreation = [
  body('roomId')
    .optional()
    .isLength({ min: 6, max: 6 })
    .matches(/^[A-Z0-9]{6}$/)
    .withMessage('Room ID must be 6 uppercase alphanumeric characters'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Room name must be 1-50 characters long')
    .escape(),
  handleValidationErrors
];

const validateRoomId = [
  param('roomId')
    .isLength({ min: 6, max: 6 })
    .matches(/^[A-Z0-9]{6}$/)
    .withMessage('Invalid room ID format'),
  handleValidationErrors
];

const validateRoomCheck = [
  query('roomId')
    .isLength({ min: 6, max: 6 })
    .matches(/^[A-Z0-9]{6}$/)
    .withMessage('Invalid room ID format'),
  handleValidationErrors
];

// User validation rules
const validateUsername = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Username must be 2-20 characters long')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .escape(),
  handleValidationErrors
];

// Chat validation rules
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be 1-500 characters long')
    .escape(),
  handleValidationErrors
];

// Video validation rules
const validateVideoUrl = [
  body('videoUrl')
    .isURL()
    .withMessage('Invalid URL format')
    .matches(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/)
    .withMessage('Must be a valid YouTube URL'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters long')
    .escape(),
  body('duration')
    .isInt({ min: 0, max: 7200 })
    .withMessage('Duration must be between 0 and 7200 seconds'),
  body('thumbnail')
    .optional()
    .isURL()
    .withMessage('Thumbnail must be a valid URL'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRoomCreation,
  validateRoomId,
  validateRoomCheck,
  validateUsername,
  validateChatMessage,
  validateVideoUrl
};