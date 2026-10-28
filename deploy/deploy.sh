#!/bin/bash
# ==============================================================================
# Script de Deploy e Inicialização do Kairou em Produção na VPS
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"
echo "📁 Diretório da aplicação Kairou: $APP_DIR"

if [ "$APP_DIR" != "/var/www/kairou" ]; then
  mkdir -p /var/www
  ln -sfn "$APP_DIR" /var/www/kairou
  echo "🔗 Vinculado /var/www/kairou -> $APP_DIR"
fi

echo "📦 Instalando dependências de produção..."
npm install --production=false

echo "🔨 Compilando frontend..."
npm run build

echo "⚡ Configurando Nginx para Kairou..."
cp deploy/nginx-kairou.conf /etc/nginx/sites-available/kairou
ln -sf /etc/nginx/sites-available/kairou /etc/nginx/sites-enabled/kairou
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/cinetuga 2>/dev/null || true

nginx -t
systemctl reload nginx

echo "🚀 Iniciando API Backend com PM2..."
pm2 delete cinetuga-api 2>/dev/null || true
pm2 delete kairou-api 2>/dev/null || true

pm2 start server/server.js --name "kairou-api"
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

echo "🎉 DEPLOY DO KAIROU CONCLUÍDO COM SUCESSO!"
echo "Acesse http://217.217.235.211 ou https://kairou.space"
