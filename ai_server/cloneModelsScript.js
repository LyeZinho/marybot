// Script para clonar modelos do Hugging Face
import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODELS = [
  {
    name: 'gpt2',
    repo: 'openai-community/gpt2',
    path: join(__dirname, 'gpt2')
  },
  {
    name: 'nsfw_detection',
    repo: 'Falconsai/nsfw_image_detection',
    path: join(__dirname, 'nsfw_detection')
  },
];

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function runCommand(command, args, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    log(`Executando: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function cloneModel(model) {
  try {
    log(`Iniciando clone do modelo: ${model.name}`);
    
    // Verificar se o diretório já existe
    if (existsSync(model.path)) {
      log(`Modelo ${model.name} já existe em ${model.path}`);
      return;
    }
    
    // Criar diretório pai se não existir
    const parentDir = dirname(model.path);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }
    
    // Verificar se git-lfs está instalado
    try {
      await runCommand('git', ['lfs', 'version']);
      log('Git LFS detectado');
    } catch (error) {
      log('Aviso: Git LFS não encontrado. Alguns arquivos podem não ser baixados corretamente.');
    }
    
    // Clonar repositório do Hugging Face
    await runCommand('git', [
      'clone',
      `https://huggingface.co/${model.repo}`,
      model.path
    ]);
    
    log(`Modelo ${model.name} clonado com sucesso!`);
    
    // Verificar arquivos importantes
    const importantFiles = ['config.json', 'tokenizer.json', 'vocab.json'];
    for (const file of importantFiles) {
      const filePath = join(model.path, file);
      if (existsSync(filePath)) {
        log(`✓ ${file} encontrado`);
      } else {
        log(`⚠ ${file} não encontrado`);
      }
    }
    
  } catch (error) {
    log(`Erro ao clonar modelo ${model.name}: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    log('Iniciando script de clone de modelos');
    log(`Diretório de trabalho: ${__dirname}`);
    
    // Verificar se git está instalado
    try {
      await runCommand('git', ['--version']);
      log('Git detectado');
    } catch (error) {
      throw new Error('Git não está instalado ou não está no PATH');
    }
    
    // Clonar cada modelo
    for (const model of MODELS) {
      await cloneModel(model);
      log(''); // Linha em branco para separação
    }
    
    log('Todos os modelos foram processados com sucesso!');
    log('Para usar os modelos, certifique-se de ter uma chave API do Hugging Face configurada.');
    
  } catch (error) {
    log(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Erro:', error);
    process.exit(1);
  });
} 