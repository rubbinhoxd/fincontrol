#!/usr/bin/env bash
# add-bot.sh — provisiona um bot WhatsApp novo no VPS pra um usuario existente.
#
# Uso:
#   ./scripts/add-bot.sh <slug> <email> <jid>
#
# Ex:
#   ./scripts/add-bot.sh namorada laisa.queirogaa@gmail.com 120363xxxxxxxxxx@g.us
#
# O script pergunta a senha do usuario e a ANTHROPIC_API_KEY por prompt seguro
# (nao vao pra bash history nem pra logs).
#
# Requisitos:
#   - Acesso SSH sem senha ao VPS (chave publica ja registrada)
#   - O usuario ja deve existir no banco do VPS (migrado por migrate-user-to-vps.sh)

set -e

VPS_HOST="${VPS_HOST:-177.7.33.241}"
VPS_USER="${VPS_USER:-root}"

if [ $# -lt 3 ]; then
  cat <<USAGE
Uso: $0 <slug> <email> <jid>

  slug   Identificador curto do bot (ex: namorada, cunhada). Vai virar container fincontrol-bot-<slug>.
         Aceita a-z, 0-9 e -. Nao use maiuscula, underline nem acento.
  email  Email do usuario no FinControl (a API vai autenticar com ele).
  jid    JID do grupo autorizado no WhatsApp (formato 120363...@g.us).
         Pode usar o mesmo grupo que ja e usado localmente — o JID nao muda.

Depois o script vai pedir SENHA e ANTHROPIC_API_KEY (nao ficam no historico).

Exemplo:
  $0 namorada laisa.queirogaa@gmail.com 120363430170153375@g.us

USAGE
  exit 1
fi

SLUG="$1"
EMAIL="$2"
JID="$3"

# Valida slug (a-z, 0-9, -)
if ! echo "$SLUG" | grep -qE '^[a-z0-9-]+$'; then
  echo "✗ Slug invalido: '$SLUG'. Use so a-z, 0-9 e -."
  exit 1
fi

# Testa SSH
if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" 'echo ok' >/dev/null 2>&1; then
  echo "✗ SSH sem senha pro VPS falhou."
  echo "  Rode: ssh-copy-id $VPS_USER@$VPS_HOST"
  exit 1
fi

echo "→ Provisionando bot '$SLUG' pra $EMAIL"
echo "→ JID do grupo: $JID"
echo ""

# Prompts seguros pros secrets
read -sp "Senha do usuario no FinControl: " PASSWORD
echo
if [ -z "$PASSWORD" ]; then
  echo "✗ Senha vazia. Abortando."
  exit 1
fi

# A chave da Anthropic e compartilhada entre todos os bots. Se ja existe pelo
# menos um bot no VPS, reaproveita a chave dele em vez de pedir de novo.
# Voce ainda pode forcar uma chave especifica passando ANTHROPIC_API_KEY=... antes do comando.
if [ -z "$ANTHROPIC_API_KEY" ]; then
  ANTHROPIC_KEY="$(ssh -o BatchMode=yes "$VPS_USER@$VPS_HOST" \
    "grep -h '^ANTHROPIC_API_KEY=' /root/fincontrol/bots/*.env 2>/dev/null | head -1 | cut -d= -f2-")"
else
  ANTHROPIC_KEY="$ANTHROPIC_API_KEY"
fi

if [ -z "$ANTHROPIC_KEY" ]; then
  echo "(nenhum bot pre-existente pra reaproveitar a chave)"
  read -sp "ANTHROPIC_API_KEY (sk-ant-...): " ANTHROPIC_KEY
  echo
  if [ -z "$ANTHROPIC_KEY" ]; then
    echo "✗ Chave vazia. Abortando."
    exit 1
  fi
else
  echo "→ ANTHROPIC_API_KEY reaproveitada de outro bot ja provisionado"
fi

echo ""
echo "→ Enviando pro VPS..."

# Passa os valores via env vars pro SSH (nao aparece na command line)
ssh "$VPS_USER@$VPS_HOST" \
  SLUG="$SLUG" EMAIL="$EMAIL" JID="$JID" PASSWORD="$PASSWORD" ANTHROPIC_KEY="$ANTHROPIC_KEY" \
  "bash -s" <<'REMOTE_SCRIPT'
set -e
cd /root/fincontrol

mkdir -p bots
chmod 700 bots

# Cria o .env do bot (600 = so o root le)
cat > "bots/$SLUG.env" <<EOF
# Bot do $SLUG — VPS producao
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

FINCONTROL_API_URL=http://api:8080/api
FINCONTROL_EMAIL=$EMAIL
FINCONTROL_PASSWORD=$PASSWORD

ALLOWED_JID=$JID

LOG_LEVEL=info
EOF
chmod 600 "bots/$SLUG.env"
echo "  ✓ bots/$SLUG.env criado"

# Regenera docker-compose.prod.yml com base fixa + um bot pra cada arquivo em bots/
BOT_SERVICES=""
BOT_VOLUMES=""
for BOT_ENV in bots/*.env; do
  [ -f "$BOT_ENV" ] || continue
  BSLUG=$(basename "$BOT_ENV" .env)
  BOT_SERVICES="${BOT_SERVICES}
  bot-${BSLUG}:
    build: ./fincontrol-bot
    container_name: fincontrol-bot-${BSLUG}
    env_file:
      - ./bots/${BSLUG}.env
    volumes:
      - bot_auth_${BSLUG}:/app/auth_info
    depends_on:
      api:
        condition: service_started
    restart: unless-stopped
    profiles: [\"bot\"]
"
  BOT_VOLUMES="${BOT_VOLUMES}
  bot_auth_${BSLUG}:"
done

cat > docker-compose.prod.yml <<EOF
services:
  postgres:
    image: postgres:16-alpine
    container_name: fincontrol-db
    environment:
      POSTGRES_DB: fincontrol
      POSTGRES_USER: fincontrol
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fincontrol"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  api:
    build: ./fincontrol-api
    container_name: fincontrol-api
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/fincontrol
      SPRING_DATASOURCE_USERNAME: fincontrol
      SPRING_DATASOURCE_PASSWORD: \${POSTGRES_PASSWORD}
      APP_JWT_SECRET: \${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  web:
    build: ./fincontrol-web
    container_name: fincontrol-web
    depends_on:
      - api
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    container_name: fincontrol-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
    restart: unless-stopped
${BOT_SERVICES}
volumes:
  pgdata:
  caddy_data:
  caddy_config:${BOT_VOLUMES}
EOF
echo "  ✓ docker-compose.prod.yml regenerado com $(ls bots/*.env 2>/dev/null | wc -l | tr -d ' ') bot(s)"

# Sobe o novo bot
echo "→ Buildando e subindo bot-$SLUG..."
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile bot up -d --build "bot-$SLUG" 2>&1 | tail -3

echo ""
echo "✓ Bot '$SLUG' provisionado."
echo ""
echo "Proximo passo — ela precisa escanear o QR:"
echo "  ssh root@VPS_HOST_PLACEHOLDER 'docker compose --env-file /root/fincontrol/.env.prod -f /root/fincontrol/docker-compose.prod.yml logs -f bot-$SLUG'"
echo ""
echo "Aponta a camera do WhatsApp pro QR code que aparece no terminal."
echo "Depois de conectar, Ctrl+C sai do log — o bot continua rodando em background."
REMOTE_SCRIPT

echo ""
echo "✓ Deploy concluido. Pra ela ver o QR do celular dela:"
echo ""
echo "  ssh root@$VPS_HOST 'docker compose --env-file /root/fincontrol/.env.prod -f /root/fincontrol/docker-compose.prod.yml logs -f bot-$SLUG'"
