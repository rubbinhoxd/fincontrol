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

echo "→ Parando o bot..."
docker compose stop bot

echo "→ Removendo o container..."
docker compose rm -f bot

echo "→ Apagando o volume da sessao (auth_info)..."
docker volume rm projetofinanceiro_bot_auth || echo "(volume ja estava removido, tudo bem)"

echo "→ Subindo o bot novamente (sem rebuild)..."
docker compose up -d bot

echo ""
echo "✓ Sessao resetada. Agora:"
echo "  1. Remova o dispositivo antigo no WhatsApp (Config → Dispositivos conectados)"
echo "  2. Rode: docker compose logs -f bot"
echo "  3. Escaneie o novo QR code"
echo ""
