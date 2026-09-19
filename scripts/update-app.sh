#!/usr/bin/env bash
# update-app.sh — atualiza a instalacao local do FinControl.
# Faz git pull, rebuild dos containers e sobe tudo.
# Uso: rode esse script quando quiser puxar mudancas novas do repo.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "→ Diretorio: $PROJECT_DIR"
cd "$PROJECT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker nao encontrado. Instale o Docker Desktop."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker nao esta rodando. Abra o Docker Desktop e tente de novo."
  exit 1
fi

if [ ! -d .git ]; then
  echo "⚠ Este diretorio nao e um repo git. Pulando git pull."
  echo "  (Se voce recebeu o app como zip, baixe a versao nova manualmente.)"
else
  echo "→ Puxando ultimas mudancas do repo..."
  git pull --ff-only
fi

echo "→ Reconstruindo containers (isso pode levar alguns minutos)..."
docker compose build

echo "→ Subindo containers..."
docker compose up -d

echo ""
echo "✓ App atualizado. Status:"
docker compose ps
