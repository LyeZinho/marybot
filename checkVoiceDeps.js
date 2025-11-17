/**
 * Script para verificar dependências de voz do Discord.js
 */

import { generateDependencyReport } from '@discordjs/voice';

console.log('🔍 Verificando dependências de voz do Discord.js...\n');
console.log(generateDependencyReport());