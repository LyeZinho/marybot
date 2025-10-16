-- Script de inicialização do banco de dados
-- Este arquivo é executado automaticamente quando o container do PostgreSQL é criado

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Configurar timezone padrão
SET timezone = 'America/Sao_Paulo';

-- Configurar encoding
SET client_encoding = 'UTF8';