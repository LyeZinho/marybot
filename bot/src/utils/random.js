/**
 * Gera um número inteiro aleatório entre min e max (inclusive)
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number}
 */
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gera um número decimal aleatório entre min e max
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number}
 */
export function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Retorna um elemento aleatório de um array
 * @param {Array} array - Array para escolher
 * @returns {*}
 */
export function getRandomElement(array) {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error('Array deve ser não-vazio');
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Retorna múltiplos elementos aleatórios únicos de um array
 * @param {Array} array - Array para escolher
 * @param {number} count - Quantidade de elementos
 * @returns {Array}
 */
export function getRandomElements(array, count) {
  if (!Array.isArray(array)) {
    throw new Error('Primeiro parâmetro deve ser um array');
  }
  
  if (count >= array.length) {
    return [...array];
  }
  
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Embaralha um array usando o algoritmo Fisher-Yates
 * @param {Array} array - Array para embaralhar
 * @returns {Array}
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Gera uma cor hexadecimal aleatória
 * @returns {string}
 */
export function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Gera uma chance baseada em porcentagem
 * @param {number} percentage - Porcentagem de chance (0-100)
 * @returns {boolean}
 */
export function randomChance(percentage) {
  return Math.random() < (percentage / 100);
}

/**
 * Gera um ID único simples
 * @param {number} length - Comprimento do ID
 * @returns {string}
 */
export function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Rola um dado com um número específico de lados
 * @param {number} sides - Número de lados do dado
 * @returns {number}
 */
export function rollDice(sides = 6) {
  return getRandomInt(1, sides);
}

/**
 * Rola múltiplos dados
 * @param {number} count - Quantidade de dados
 * @param {number} sides - Número de lados por dado
 * @returns {Array}
 */
export function rollMultipleDice(count, sides = 6) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(rollDice(sides));
  }
  return results;
}

/**
 * Gera stats aleatórios para um personagem
 * @param {number} rarity - Raridade do personagem (1-5)
 * @returns {Object}
 */
export function generateRandomStats(rarity = 1) {
  const baseStats = {
    1: { min: 10, max: 30 },
    2: { min: 25, max: 45 },
    3: { min: 40, max: 70 },
    4: { min: 65, max: 90 },
    5: { min: 85, max: 100 }
  };

  const { min, max } = baseStats[rarity] || baseStats[1];
  
  return {
    attack: getRandomInt(min, max),
    defense: getRandomInt(min, max),
    luck: getRandomInt(min, max)
  };
}

/**
 * Simula um sistema de drop com diferentes raridades
 * @param {Object} dropRates - Objeto com raridades e suas chances
 * @returns {string}
 */
export function rollRarity(dropRates = {}) {
  const defaultRates = {
    'common': 50,
    'uncommon': 30,
    'rare': 15,
    'epic': 4,
    'legendary': 1
  };
  
  const rates = { ...defaultRates, ...dropRates };
  const roll = getRandomInt(1, 100);
  let cumulative = 0;
  
  for (const [rarity, chance] of Object.entries(rates)) {
    cumulative += chance;
    if (roll <= cumulative) {
      return rarity;
    }
  }
  
  return 'common';
}