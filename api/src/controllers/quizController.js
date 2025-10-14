import { prisma } from '../database/client.js';
import { validationResult } from 'express-validator';

export class QuizController {
  // Get all quiz questions with pagination and filters
  static async getAllQuestions(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { 
        limit = 20, 
        offset = 0, 
        category,
        difficulty,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build where clause
      const where = {};
      
      if (category) {
        where.category = {
          contains: category,
          mode: 'insensitive'
        };
      }
      
      if (difficulty) {
        where.difficulty = difficulty;
      }
      
      if (search) {
        where.OR = [
          {
            question: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            category: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }

      // Build orderBy clause
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      const [questions, total] = await Promise.all([
        prisma.quizQuestion.findMany({
          where,
          orderBy,
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.quizQuestion.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          questions,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(total / limit)
          }
        },
        message: `Retrieved ${questions.length} quiz questions`
      });

    } catch (error) {
      next(error);
    }
  }

  // Get question by ID
  static async getQuestionById(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      const question = await prisma.quizQuestion.findUnique({
        where: { id: parseInt(id) }
      });

      if (!question) {
        return res.status(404).json({
          error: 'Question not found'
        });
      }

      res.json({
        success: true,
        data: { question },
        message: 'Question retrieved successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Get random question for quiz
  static async getRandomQuestion(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { category, difficulty } = req.query;

      // Build where clause
      const where = {};
      if (category) {
        where.category = {
          contains: category,
          mode: 'insensitive'
        };
      }
      if (difficulty) {
        where.difficulty = difficulty;
      }

      // Get total count
      const totalQuestions = await prisma.quizQuestion.count({ where });

      if (totalQuestions === 0) {
        return res.status(404).json({
          error: 'No questions found',
          message: 'No questions available with the specified criteria'
        });
      }

      // Get random question
      const randomIndex = Math.floor(Math.random() * totalQuestions);
      const question = await prisma.quizQuestion.findMany({
        where,
        skip: randomIndex,
        take: 1
      });

      res.json({
        success: true,
        data: { 
          question: question[0],
          totalAvailable: totalQuestions
        },
        message: 'Random question retrieved successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Create new question
  static async createQuestion(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { question, options, correctAnswer, category, difficulty, explanation } = req.body;

      // Validate that correctAnswer exists in options
      if (!options.includes(correctAnswer)) {
        return res.status(400).json({
          error: 'Invalid correct answer',
          message: 'Correct answer must be one of the provided options'
        });
      }

      const newQuestion = await prisma.quizQuestion.create({
        data: {
          question,
          options,
          correctAnswer,
          category,
          difficulty,
          explanation
        }
      });

      res.status(201).json({
        success: true,
        data: { question: newQuestion },
        message: 'Question created successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Update question
  static async updateQuestion(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;
      const { question, options, correctAnswer, category, difficulty, explanation } = req.body;

      // Check if question exists
      const existingQuestion = await prisma.quizQuestion.findUnique({
        where: { id: parseInt(id) }
      });

      if (!existingQuestion) {
        return res.status(404).json({
          error: 'Question not found'
        });
      }

      // Validate that correctAnswer exists in options (if both are provided)
      if (options && correctAnswer && !options.includes(correctAnswer)) {
        return res.status(400).json({
          error: 'Invalid correct answer',
          message: 'Correct answer must be one of the provided options'
        });
      }

      // If only correctAnswer is provided, validate against existing options
      if (correctAnswer && !options && !existingQuestion.options.includes(correctAnswer)) {
        return res.status(400).json({
          error: 'Invalid correct answer',
          message: 'Correct answer must be one of the existing options'
        });
      }

      // If only options is provided, validate that existing correctAnswer is still valid
      if (options && !correctAnswer && !options.includes(existingQuestion.correctAnswer)) {
        return res.status(400).json({
          error: 'Invalid options update',
          message: 'New options must include the current correct answer, or provide a new correct answer'
        });
      }

      const updatedQuestion = await prisma.quizQuestion.update({
        where: { id: parseInt(id) },
        data: {
          ...(question && { question }),
          ...(options && { options }),
          ...(correctAnswer && { correctAnswer }),
          ...(category && { category }),
          ...(difficulty && { difficulty }),
          ...(explanation !== undefined && { explanation })
        }
      });

      res.json({
        success: true,
        data: { question: updatedQuestion },
        message: 'Question updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Delete question
  static async deleteQuestion(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { id } = req.params;

      // Check if question exists
      const question = await prisma.quizQuestion.findUnique({
        where: { id: parseInt(id) }
      });

      if (!question) {
        return res.status(404).json({
          error: 'Question not found'
        });
      }

      await prisma.quizQuestion.delete({
        where: { id: parseInt(id) }
      });

      res.json({
        success: true,
        data: { deletedQuestion: question },
        message: 'Question deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }

  // Get questions by category
  static async getQuestionsByCategory(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors.array()
        });
      }

      const { category } = req.params;
      const { limit = 20, offset = 0, difficulty } = req.query;

      const where = {
        category: {
          contains: category,
          mode: 'insensitive'
        }
      };

      if (difficulty) {
        where.difficulty = difficulty;
      }

      const [questions, total] = await Promise.all([
        prisma.quizQuestion.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.quizQuestion.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          questions,
          category,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(total / limit)
          }
        },
        message: `Retrieved ${questions.length} questions from category: ${category}`
      });

    } catch (error) {
      next(error);
    }
  }

  // Get available categories
  static async getCategories(req, res, next) {
    try {
      const categories = await prisma.quizQuestion.groupBy({
        by: ['category'],
        _count: {
          id: true
        },
        orderBy: {
          category: 'asc'
        }
      });

      res.json({
        success: true,
        data: {
          categories: categories.map(cat => ({
            name: cat.category,
            questionCount: cat._count.id
          }))
        },
        message: 'Categories retrieved successfully'
      });

    } catch (error) {
      next(error);
    }
  }
}