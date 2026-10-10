#!/bin/bash
# ==============================================================================
# Script de Configuração Inicial do Servidor AlphaVPS para o Cinetuga (cinetuga.vip)
# Compatível com Ubuntu 22.04 LTS e 24.04 LTS
# ==============================================================================

set -e

echo "🚀 Iniciando configuração do servidor Cinetuga..."

# 1. Atualizar o sistema
echo "📦 Atualizando pacotes do sistema..."
apt-get update && apt-get upgrade -y

# 2. Instalar dependências essenciais
echo "📦 Instalando curl, git, ufw, nginx, certbot..."
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

# 3. Instalar Node.js 20 LTS
echo "📦 Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "Node.js versão: $(node -v)"
echo "NPM versão: $(npm -v)"

# 4. Instalar PM2 para manter o backend sempre ativo
echo "📦 Instalando PM2..."
npm install -g pm2

# 5. Configurar Firewall (UFW)
echo "🛡️ Configurando Firewall (Portas 22 SSH, 80 HTTP, 443 HTTPS)..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 6. Criar diretório do projeto
echo "📁 Criando diretório /var/www/cinetuga..."
mkdir -p /var/www/cinetuga
chown -R www-data:www-data /var/www/cinetuga
chmod -R 755 /var/www/cinetuga

echo "✅ Servidor preparado com sucesso!"
echo "Agora você pode enviar os arquivos do Cinetuga para /var/www/cinetuga"
