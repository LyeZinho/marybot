/**
 * 🧪 Utilitário de teste para geração de áudio
 */

import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateTestAudio(text, outputPath) {
    const sampleRate = 22050;
    const duration = 3; // 3 segundos fixos para teste
    const samples = Math.floor(sampleRate * duration);
    const dataSize = samples * 2;
    const fileSize = dataSize + 44;
    
    const buffer = Buffer.alloc(fileSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);  // PCM
    buffer.writeUInt16LE(1, 22);  // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Gerar tom audível de teste
    const baseFreq = 440; // A4 - mais audível
    
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        
        // Onda senoidal simples e forte
        const wave = Math.sin(2 * Math.PI * baseFreq * t);
        
        // Envelope simples
        let envelope = 1;
        const fadeTime = 0.1;
        if (t < fadeTime) {
            envelope = t / fadeTime;
        } else if (t > duration - fadeTime) {
            envelope = (duration - t) / fadeTime;
        }
        
        // Amplitude bem alta para garantir audibilidade
        const amplitude = wave * envelope * 0.7;
        const sample = Math.round(amplitude * 32000);
        
        buffer.writeInt16LE(Math.max(-32767, Math.min(32767, sample)), 44 + i * 2);
    }
    
    writeFileSync(outputPath, buffer);
    console.log(`Áudio de teste gerado: ${outputPath} (${(buffer.length / 1024).toFixed(1)}KB)`);
    return outputPath;
}

// Gerar um áudio de teste
const testPath = path.join(__dirname, '../../temp/tts/test_audio.wav');
generateTestAudio("teste", testPath);