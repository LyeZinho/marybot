import express from 'express';
import { body, param, query } from 'express-validator';
import { QuizController } from '../controllers/quizController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all questions with pagination and filters
router.get('/', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('category')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  query('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Invalid difficulty level'),
  query('search')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['question', 'category', 'difficulty', 'createdAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
], QuizController.getAllQuestions);

// Get random question
router.get('/random', [
  query('category')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  query('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Invalid difficulty level')
], QuizController.getRandomQuestion);

// Get available categories
router.get('/categories', QuizController.getCategories);

// Get questions by category
router.get('/category/:category', [
  param('category')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Invalid difficulty level')
], QuizController.getQuestionsByCategory);

// Get question by ID
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Question ID must be a positive integer')
], QuizController.getQuestionById);

// Create new question
router.post('/', [
  body('question')
    .isString()
    .notEmpty()
    .isLength({ min: 10, max: 500 })
    .withMessage('Question is required and must be between 10 and 500 characters'),
  body('options')
    .isArray({ min: 2, max: 6 })
    .withMessage('Options must be an array with 2 to 6 items'),
  body('options.*')
    .isString()
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be a non-empty string with max 200 characters'),
  body('correctAnswer')
    .isString()
    .notEmpty()
    .withMessage('Correct answer is required'),
  body('category')
    .isString()
    .notEmpty()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category is required and must be between 1 and 50 characters'),
  body('difficulty')
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Difficulty must be EASY, MEDIUM, or HARD'),
  body('explanation')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Explanation must be less than 1000 characters')
], QuizController.createQuestion);

// Update question
router.put('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Question ID must be a positive integer'),
  body('question')
    .optional()
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Question must be between 10 and 500 characters'),
  body('options')
    .optional()
    .isArray({ min: 2, max: 6 })
    .withMessage('Options must be an array with 2 to 6 items'),
  body('options.*')
    .optional()
    .isString()
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('Each option must be a non-empty string with max 200 characters'),
  body('correctAnswer')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Correct answer must be a non-empty string'),
  body('category')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters'),
  body('difficulty')
    .optional()
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Difficulty must be EASY, MEDIUM, or HARD'),
  body('explanation')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Explanation must be less than 1000 characters')
], QuizController.updateQuestion);

// Delete question
router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Question ID must be a positive integer')
], QuizController.deleteQuestion);

export default router;