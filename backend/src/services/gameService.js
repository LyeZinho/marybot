import { eventBus } from '../index.js';
import cron from 'node-cron';

/**
 * Game Service - Handles game events, quiz system, and character management
 */
export class GameService {
  constructor() {
    this.activeQuizzes = new Map();
    this.setupEventListeners();
    this.setupScheduledTasks();
  }

  setupEventListeners() {
    eventBus.on('quiz_started', this.handleQuizStarted.bind(this));
    eventBus.on('quiz_answered', this.handleQuizAnswered.bind(this));
    eventBus.on('character_pulled', this.handleCharacterPulled.bind(this));
    eventBus.on('battle_initiated', this.handleBattleInitiated.bind(this));
  }

  setupScheduledTasks() {
    // Clean up expired quizzes every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.cleanupExpiredQuizzes();
    });

    // Daily character spotlight
    cron.schedule('0 12 * * *', async () => {
      await this.dailyCharacterSpotlight();
    });

    // Weekly gacha rate up event
    cron.schedule('0 0 * * 1', async () => {
      await this.weeklyRateUpEvent();
    });
  }

  async handleQuizStarted(data) {
    const { quizId, userId, questions, timeLimit } = data;
    
    // Store active quiz
    this.activeQuizzes.set(quizId, {
      userId,
      questions,
      currentQuestion: 0,
      score: 0,
      startTime: Date.now(),
      timeLimit: timeLimit || 30000, // 30 seconds default
      answers: []
    });

    // Set timeout for quiz expiration
    setTimeout(() => {
      if (this.activeQuizzes.has(quizId)) {
        this.expireQuiz(quizId);
      }
    }, (timeLimit || 30000) * questions.length);

    console.log(`🎯 Quiz ${quizId} started for user ${userId}`);
  }

  async handleQuizAnswered(data) {
    const { quizId, answer, timeToAnswer } = data;
    
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) {
      console.log(`❌ Quiz ${quizId} not found or expired`);
      return;
    }

    const currentQuestion = quiz.questions[quiz.currentQuestion];
    const isCorrect = answer === currentQuestion.correct;
    
    // Calculate score based on correctness and speed
    let points = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, quiz.timeLimit - timeToAnswer) / 1000;
      points = Math.floor(100 + speedBonus * 10);
      quiz.score += points;
    }

    quiz.answers.push({
      question: currentQuestion.question,
      userAnswer: answer,
      correctAnswer: currentQuestion.correct,
      isCorrect,
      points,
      timeToAnswer
    });

    quiz.currentQuestion++;

    // Check if quiz is complete
    if (quiz.currentQuestion >= quiz.questions.length) {
      await this.completeQuiz(quizId);
    } else {
      // Send next question
      eventBus.broadcast('quiz_next_question', {
        quizId,
        question: quiz.questions[quiz.currentQuestion],
        questionNumber: quiz.currentQuestion + 1,
        totalQuestions: quiz.questions.length,
        currentScore: quiz.score
      });
    }
  }

  async completeQuiz(quizId) {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) return;

    const duration = Date.now() - quiz.startTime;
    const accuracy = (quiz.answers.filter(a => a.isCorrect).length / quiz.answers.length) * 100;

    // Calculate rewards based on performance
    const baseReward = 50;
    const scoreBonus = Math.floor(quiz.score / 10);
    const accuracyBonus = Math.floor(accuracy * 2);
    const totalCoins = baseReward + scoreBonus + accuracyBonus;

    // Award coins and XP
    try {
      await eventBus.request('api', '/api/economy/coins', {
        discordId: quiz.userId,
        amount: totalCoins,
        reason: `Quiz completion (Score: ${quiz.score})`
      });

      await eventBus.request('api', '/api/economy/xp', {
        discordId: quiz.userId,
        amount: Math.floor(quiz.score / 20),
        reason: 'Quiz completion'
      });

      // Store quiz result
      await eventBus.request('api', '/api/quiz/result', {
        userId: quiz.userId,
        score: quiz.score,
        accuracy,
        duration,
        answers: quiz.answers
      });

      eventBus.broadcast('quiz_completed', {
        quizId,
        userId: quiz.userId,
        score: quiz.score,
        accuracy,
        duration,
        rewards: {
          coins: totalCoins,
          xp: Math.floor(quiz.score / 20)
        }
      });

    } catch (error) {
      console.error('❌ Quiz completion error:', error);
    }

    this.activeQuizzes.delete(quizId);
  }

  async expireQuiz(quizId) {
    const quiz = this.activeQuizzes.get(quizId);
    if (!quiz) return;

    eventBus.broadcast('quiz_expired', {
      quizId,
      userId: quiz.userId,
      partialScore: quiz.score,
      answeredQuestions: quiz.answers.length
    });

    this.activeQuizzes.delete(quizId);
  }

  async handleCharacterPulled(data) {
    const { userId, character, rarity, cost } = data;
    
    try {
      // Add character to user's collection
      await eventBus.request('api', '/api/characters/collect', {
        discordId: userId,
        characterId: character.id,
        rarity
      });

      // Check for duplicate bonus
      const collection = await eventBus.request('api', `/api/characters/user/${userId}`);
      const duplicateCount = collection.data.filter(c => c.characterId === character.id).length;

      if (duplicateCount > 1) {
        // Give coins for duplicate
        const bonusCoins = rarity === 'legendary' ? 500 : rarity === 'epic' ? 200 : 50;
        
        await eventBus.request('api', '/api/economy/coins', {
          discordId: userId,
          amount: bonusCoins,
          reason: `Duplicate ${character.name} bonus`
        });

        eventBus.broadcast('duplicate_bonus', {
          userId,
          character: character.name,
          bonusCoins,
          duplicateCount
        });
      }

      eventBus.broadcast('character_collected', {
        userId,
        character,
        rarity,
        cost,
        isNew: duplicateCount === 1
      });

    } catch (error) {
      console.error('❌ Character pull processing error:', error);
    }
  }

  async handleBattleInitiated(data) {
    const { battleId, attacker, defender, attackerCharacter, defenderCharacter } = data;
    
    try {
      // Get character stats
      const attackerStats = await this.getCharacterStats(attackerCharacter.id);
      const defenderStats = await this.getCharacterStats(defenderCharacter.id);

      // Simulate battle
      const battleResult = await this.simulateBattle(attackerStats, defenderStats);

      // Update battle in database
      await eventBus.request('api', '/api/battles/update', {
        battleId,
        result: battleResult
      });

      // Award rewards
      const winner = battleResult.winner === 'attacker' ? attacker : defender;
      const loser = battleResult.winner === 'attacker' ? defender : attacker;

      await eventBus.request('api', '/api/economy/coins', {
        discordId: winner,
        amount: 100,
        reason: 'Battle victory'
      });

      await eventBus.request('api', '/api/economy/xp', {
        discordId: winner,
        amount: 25,
        reason: 'Battle victory'
      });

      // Smaller consolation prize for loser
      await eventBus.request('api', '/api/economy/coins', {
        discordId: loser,
        amount: 25,
        reason: 'Battle participation'
      });

      eventBus.broadcast('battle_completed', {
        battleId,
        winner,
        loser,
        battleResult,
        rewards: {
          winner: { coins: 100, xp: 25 },
          loser: { coins: 25, xp: 0 }
        }
      });

    } catch (error) {
      console.error('❌ Battle processing error:', error);
    }
  }

  async getCharacterStats(characterId) {
    try {
      const result = await eventBus.request('api', `/api/characters/${characterId}`);
      return result.data;
    } catch (error) {
      console.error('❌ Character stats lookup error:', error);
      return null;
    }
  }

  async simulateBattle(attacker, defender) {
    // Simple battle simulation
    const attackerPower = attacker.attack + (attacker.speed * 0.5);
    const defenderPower = defender.defense + (defender.hp * 0.3);
    
    const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2 multiplier
    const finalAttackerPower = attackerPower * randomFactor;
    const finalDefenderPower = defenderPower * (2 - randomFactor); // Inverse for balance

    return {
      winner: finalAttackerPower > finalDefenderPower ? 'attacker' : 'defender',
      attackerPower: Math.round(finalAttackerPower),
      defenderPower: Math.round(finalDefenderPower),
      turns: Math.floor(Math.random() * 5) + 3, // 3-7 turns
      critical: Math.random() < 0.15 // 15% chance for critical
    };
  }

  async cleanupExpiredQuizzes() {
    const now = Date.now();
    let cleaned = 0;

    for (const [quizId, quiz] of this.activeQuizzes.entries()) {
      const maxDuration = quiz.timeLimit * quiz.questions.length + 60000; // Extra minute buffer
      if (now - quiz.startTime > maxDuration) {
        await this.expireQuiz(quizId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired quizzes`);
    }
  }

  async dailyCharacterSpotlight() {
    try {
      // Get random character for spotlight
      const characters = await eventBus.request('api', '/api/characters/random');
      const spotlightCharacter = characters.data;

      eventBus.broadcast('character_spotlight', {
        character: spotlightCharacter,
        bonusRate: 2.0, // 2x rate for featured character
        duration: '24h'
      });

      console.log(`⭐ Daily spotlight: ${spotlightCharacter.name}`);
    } catch (error) {
      console.error('❌ Character spotlight error:', error);
    }
  }

  async weeklyRateUpEvent() {
    try {
      eventBus.broadcast('rate_up_event', {
        type: 'legendary',
        multiplier: 1.5,
        duration: '7d',
        message: 'Legendary Rate Up Event! 50% increased legendary rates!'
      });

      console.log('🎉 Weekly rate up event activated');
    } catch (error) {
      console.error('❌ Rate up event error:', error);
    }
  }

  // Get active quiz information
  getActiveQuiz(quizId) {
    return this.activeQuizzes.get(quizId);
  }

  // Get quiz statistics
  getQuizStats() {
    return {
      activeQuizzes: this.activeQuizzes.size,
      quizzes: Array.from(this.activeQuizzes.entries()).map(([id, quiz]) => ({
        id,
        userId: quiz.userId,
        progress: `${quiz.currentQuestion}/${quiz.questions.length}`,
        score: quiz.score,
        duration: Date.now() - quiz.startTime
      }))
    };
  }
}

// Initialize the service
export const gameService = new GameService();