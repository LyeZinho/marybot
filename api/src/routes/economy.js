import express from 'express';
import { body, param, query } from 'express-validator';
import { EconomyController } from '../controllers/economyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Process daily reward
router.post('/daily', [
  body('discordId')
    .isString()
    .notEmpty()
    .withMessage('Discord ID is required')
    .isLength({ min: 17, max: 19 })
    .withMessage('Invalid Discord ID format')
], EconomyController.processDailyReward);

// Add XP to user
router.post('/xp', [
  body('discordId')
    .isString()
    .notEmpty()
    .withMessage('Discord ID is required')
    .isLength({ min: 17, max: 19 })
    .withMessage('Invalid Discord ID format'),
  body('amount')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Amount must be between 1 and 10000'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Reason must be less than 100 characters')
], EconomyController.addXP);

// Add/remove coins
router.post('/coins', [
  body('discordId')
    .isString()
    .notEmpty()
    .withMessage('Discord ID is required')
    .isLength({ min: 17, max: 19 })
    .withMessage('Invalid Discord ID format'),
  body('amount')
    .isInt({ min: -100000, max: 100000 })
    .withMessage('Amount must be between -100000 and 100000')
    .custom((value) => {
      if (value === 0) {
        throw new Error('Amount cannot be zero');
      }
      return true;
    }),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Reason must be less than 100 characters')
], EconomyController.addCoins);

// Get transaction history
router.get('/history/:discordId', [
  param('discordId')
    .isString()
    .isLength({ min: 17, max: 19 })
    .withMessage('Invalid Discord ID format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
], EconomyController.getTransactionHistory);

export default router;