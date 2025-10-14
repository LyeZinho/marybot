import express from 'express';
import { body, param, query } from 'express-validator';
import { CharacterController } from '../controllers/characterController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all characters with pagination and filters
router.get('/', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('rarity')
    .optional()
    .isIn(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'])
    .withMessage('Invalid rarity'),
  query('anime')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Anime name must be between 1 and 100 characters'),
  query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['name', 'anime', 'rarity', 'createdAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
], CharacterController.getAllCharacters);

// Get random character for gacha
router.get('/random', CharacterController.getRandomCharacter);

// Get characters by rarity
router.get('/rarity/:rarity', [
  param('rarity')
    .isIn(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'])
    .withMessage('Invalid rarity'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
], CharacterController.getCharactersByRarity);

// Get character by ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Character ID must be a positive integer')
], CharacterController.getCharacterById);

// Create new character
router.post('/', [
  body('name')
    .isString()
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Character name is required and must be between 1 and 100 characters'),
  body('anime')
    .isString()
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Anime name is required and must be between 1 and 100 characters'),
  body('rarity')
    .isIn(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'])
    .withMessage('Invalid rarity'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], CharacterController.createCharacter);

// Update character
router.put('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Character ID must be a positive integer'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Character name must be between 1 and 100 characters'),
  body('anime')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Anime name must be between 1 and 100 characters'),
  body('rarity')
    .optional()
    .isIn(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHICAL'])
    .withMessage('Invalid rarity'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
], CharacterController.updateCharacter);

// Delete character
router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Character ID must be a positive integer')
], CharacterController.deleteCharacter);

export default router;