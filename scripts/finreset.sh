#!/usr/bin/env bash
# finreset — reset manual da sessao do WhatsApp bot.
# Apaga a auth_info corrompida e recria o container do bot pra gerar novo QR.
# Uso: rode este script quando o log do bot estiver enchendo de "Bad MAC" ou
# "MessageCounterError" e o auto-recovery nao disparar.

set -e

# Descobre o diretorio raiz do projeto (assume que este script fica em <root>/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "→ Diretorio do projeto: $PROJECT_DIR"
cd "$PROJECT_DIR"

# Descobre o nome real do volume antes de parar o container.
# Docker compose prefixa o volume com o nome do projeto (que vem do nome da pasta
# por padrao), entao "bot_auth" vira "<pasta>_bot_auth" — o que muda por maquina.
echo "→ Descobrindo o nome do volume da sessao..."
VOLUME_NAME="$(docker inspect fincontrol-bot --format '{{range .Mounts}}{{if eq .Destination "/app/auth_info"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)"
if [ -z "$VOLUME_NAME" ]; then
  # Fallback: procura qualquer volume que termine em _bot_auth
  VOLUME_NAME="$(docker volume ls --format '{{.Name}}' | grep '_bot_auth$' | head -1 || true)"
fi
if [ -n "$VOLUME_NAME" ]; then
  echo "  → volume detectado: $VOLUME_NAME"
else
  echo "  → nenhum volume _bot_auth encontrado (talvez ja foi limpo)"
fi

echo "→ Parando o bot..."
docker compose stop bot

echo "→ Removendo o container..."
docker compose rm -f bot

echo "→ Apagando o volume da sessao (auth_info)..."
if [ -n "$VOLUME_NAME" ]; then
  docker volume rm "$VOLUME_NAME" || echo "(falhou ao remover $VOLUME_NAME — verifique manualmente)"
else
  echo "(nenhum volume pra remover)"
fi

echo "→ Subindo o bot novamente (sem rebuild)..."
docker compose up -d bot

echo ""
echo "✓ Sessao resetada. Agora:"
echo "  1. Remova o dispositivo antigo no WhatsApp (Config → Dispositivos conectados)"
echo "  2. Rode: docker compose logs -f bot"
echo "  3. Escaneie o novo QR code"
echo ""
