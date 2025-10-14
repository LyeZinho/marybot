import express from 'express';
import { body, param, query } from 'express-validator';
import { UserController } from '../controllers/userController.js';

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('discordId')
    .isString()
    .isLength({ min: 17, max: 19 })
    .withMessage('Discord ID must be a valid snowflake'),
  body('username')
    .isString()
    .isLength({ min: 1, max: 32 })
    .withMessage('Username must be between 1 and 32 characters')
];

const updateUserValidation = [
  body('username')
    .optional()
    .isString()
    .isLength({ min: 1, max: 32 })
    .withMessage('Username must be between 1 and 32 characters'),
  body('bio')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  body('xp')
    .optional()
    .isInt({ min: 0 })
    .withMessage('XP must be a positive integer'),
  body('coins')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Coins must be a positive integer')
];

const discordIdValidation = [
  param('discordId')
    .isString()
    .isLength({ min: 17, max: 19 })
    .withMessage('Discord ID must be a valid snowflake')
];

const leaderboardValidation = [
  query('type')
    .optional()
    .isIn(['xp', 'coins', 'level', 'characters'])
    .withMessage('Type must be one of: xp, coins, level, characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive integer')
];

// Routes
router.get('/leaderboard', leaderboardValidation, UserController.getLeaderboard);
router.get('/:discordId', discordIdValidation, UserController.getUserByDiscordId);
router.get('/:discordId/stats', discordIdValidation, UserController.getUserStats);
router.post('/', createUserValidation, UserController.createUser);
router.put('/:discordId', [...discordIdValidation, ...updateUserValidation], UserController.updateUser);

export default router;