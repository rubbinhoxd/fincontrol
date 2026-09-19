#!/usr/bin/env bash
# migrate-user-to-vps.sh — migra os dados de UM usuario local pro Postgres do VPS.
# Uso: ./scripts/migrate-user-to-vps.sh <email-do-usuario>
#
# Como funciona:
#   1. Faz pg_dump completo do Postgres local (todos os users, todas as tabelas)
#   2. Envia o dump pro VPS
#   3. No VPS: cria banco temporario, restaura o dump la
#   4. Copia SO os registros do user com o email informado pro banco principal
#   5. Dropa o banco temporario
#
# Requisitos:
#   - Postgres local rodando (docker exec fincontrol-db)
#   - Acesso SSH sem senha ao VPS (rode antes: ssh-copy-id root@$VPS_HOST)

set -e

VPS_HOST="${VPS_HOST:-177.7.33.241}"
VPS_USER="${VPS_USER:-root}"
LOCAL_CONTAINER="${LOCAL_CONTAINER:-fincontrol-db}"
LOCAL_DB="${LOCAL_DB:-fincontrol}"
LOCAL_DB_USER="${LOCAL_DB_USER:-fincontrol}"
REMOTE_DB="${REMOTE_DB:-fincontrol}"

if [ -z "$1" ]; then
  echo "Uso: $0 <email-do-usuario>"
  echo ""
  echo "Migra os dados desse usuario (users + categories + cards +"
  echo "monthly_references + transactions) do Postgres local pro VPS."
  exit 1
fi

EMAIL="$1"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="/tmp/fincontrol-migrate-$TIMESTAMP.sql"
REMOTE_DUMP="/tmp/fincontrol-migrate-$TIMESTAMP.sql"
TEMP_DB="fincontrol_import_$TIMESTAMP"

echo "→ Usuario a migrar: $EMAIL"
echo "→ VPS destino: $VPS_USER@$VPS_HOST"
echo ""

# 1. Checa pre-requisitos
if ! docker ps --format '{{.Names}}' | grep -q "^${LOCAL_CONTAINER}\$"; then
  echo "✗ Container $LOCAL_CONTAINER nao esta rodando localmente."
  echo "  Rode: docker compose up -d postgres"
  exit 1
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" 'echo ok' >/dev/null 2>&1; then
  echo "✗ SSH sem senha pro VPS nao esta configurado."
  echo "  Rode primeiro: ssh-copy-id $VPS_USER@$VPS_HOST"
  exit 1
fi

# 2. Checa se o email existe no banco local
LOCAL_USER_ID="$(docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB" -tAc "SELECT id FROM users WHERE email = '$EMAIL' LIMIT 1;")"
if [ -z "$LOCAL_USER_ID" ]; then
  echo "✗ Usuario com email '$EMAIL' nao encontrado no Postgres local."
  echo "  Usuarios existentes:"
  docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB" -c "SELECT email, name FROM users;"
  exit 1
fi
echo "→ Usuario local encontrado: id=$LOCAL_USER_ID"

# 3. Dump completo do banco local
echo "→ Gerando dump do Postgres local..."
docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_DB_USER" -d "$LOCAL_DB" --no-owner --no-privileges > "$DUMP_FILE"
DUMP_SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
echo "  dump gerado: $DUMP_FILE ($DUMP_SIZE)"

# 4. Envia dump pro VPS
echo "→ Enviando dump pro VPS..."
scp -q "$DUMP_FILE" "$VPS_USER@$VPS_HOST:$REMOTE_DUMP"

# 5. No VPS: cria banco temp, restaura, copia dados do user, dropa temp
echo "→ Restaurando no VPS (banco temporario $TEMP_DB)..."
ssh "$VPS_USER@$VPS_HOST" "bash -s" <<REMOTE_SCRIPT
set -e

DB_CONTAINER=fincontrol-db
DB_USER=fincontrol
DB_MAIN=$REMOTE_DB
TEMP_DB=$TEMP_DB
EMAIL='$EMAIL'
LOCAL_USER_ID='$LOCAL_USER_ID'

# Cria banco temporario
docker exec \$DB_CONTAINER psql -U \$DB_USER -d postgres -c "DROP DATABASE IF EXISTS \$TEMP_DB;" >/dev/null
docker exec \$DB_CONTAINER psql -U \$DB_USER -d postgres -c "CREATE DATABASE \$TEMP_DB;" >/dev/null

# Restaura o dump no temp
docker exec -i \$DB_CONTAINER psql -U \$DB_USER -d \$TEMP_DB < $REMOTE_DUMP > /tmp/restore-$TIMESTAMP.log 2>&1
ERR="\$(grep -iE 'ERROR' /tmp/restore-$TIMESTAMP.log | grep -v 'already exists' | head -5 || true)"
if [ -n "\$ERR" ]; then
  echo "⚠ Erros no restore (ignorando se forem so 'already exists'):"
  echo "\$ERR"
fi

# Verifica que o user existe no temp
FOUND=\$(docker exec \$DB_CONTAINER psql -U \$DB_USER -d \$TEMP_DB -tAc "SELECT COUNT(*) FROM users WHERE id = '\$LOCAL_USER_ID';")
if [ "\$FOUND" != "1" ]; then
  echo "✗ Usuario nao encontrado no dump restaurado."
  docker exec \$DB_CONTAINER psql -U \$DB_USER -d postgres -c "DROP DATABASE IF EXISTS \$TEMP_DB;" >/dev/null
  exit 1
fi

# Checa se o user ja existe no banco principal (por email OU id)
EXISTS=\$(docker exec \$DB_CONTAINER psql -U \$DB_USER -d \$DB_MAIN -tAc "SELECT COUNT(*) FROM users WHERE id = '\$LOCAL_USER_ID' OR email = '\$EMAIL';")
if [ "\$EXISTS" != "0" ]; then
  echo "✗ Ja existe um usuario com esse id OU esse email no banco do VPS."
  echo "  Delete-o antes de migrar (via SQL: DELETE FROM users WHERE email = '\$EMAIL')."
  docker exec \$DB_CONTAINER psql -U \$DB_USER -d postgres -c "DROP DATABASE IF EXISTS \$TEMP_DB;" >/dev/null
  exit 1
fi

# Garante que dblink esteja instalado antes da transacao (nao pode falhar silenciosamente)
docker exec \$DB_CONTAINER psql -U \$DB_USER -d \$DB_MAIN -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS dblink;"

# Copia os dados: users -> categories -> cards -> monthly_references -> transactions
# (nessa ordem por causa das FKs)
# ON_ERROR_STOP=1 pra qualquer erro no INSERT fazer o script abortar em vez de fingir sucesso
echo "→ Copiando dados do user pro banco principal..."
docker exec -i \$DB_CONTAINER psql -U \$DB_USER -d \$DB_MAIN -v ON_ERROR_STOP=1 <<SQL
BEGIN;

-- 1. user
INSERT INTO users
SELECT * FROM dblink('dbname=\$TEMP_DB',
  'SELECT * FROM users WHERE id = ''\$LOCAL_USER_ID''')
AS t(LIKE users);

-- 2. categories do user
INSERT INTO categories
SELECT * FROM dblink('dbname=\$TEMP_DB',
  'SELECT * FROM categories WHERE user_id = ''\$LOCAL_USER_ID''')
AS t(LIKE categories);

-- 3. cards do user
INSERT INTO cards
SELECT * FROM dblink('dbname=\$TEMP_DB',
  'SELECT * FROM cards WHERE user_id = ''\$LOCAL_USER_ID''')
AS t(LIKE cards);

-- 4. monthly_references do user
INSERT INTO monthly_references
SELECT * FROM dblink('dbname=\$TEMP_DB',
  'SELECT * FROM monthly_references WHERE user_id = ''\$LOCAL_USER_ID''')
AS t(LIKE monthly_references);

-- 5. transactions do user
INSERT INTO transactions
SELECT * FROM dblink('dbname=\$TEMP_DB',
  'SELECT * FROM transactions WHERE user_id = ''\$LOCAL_USER_ID''')
AS t(LIKE transactions);

COMMIT;
SQL

# Estatisticas — se o user_migrado for 0, algo deu errado silenciosamente
USER_COUNT=\$(docker exec \$DB_CONTAINER psql -U \$DB_USER -d \$DB_MAIN -tAc "SELECT COUNT(*) FROM users WHERE id = '\$LOCAL_USER_ID';")
if [ "\$USER_COUNT" != "1" ]; then
  echo "✗ Migracao falhou: usuario nao foi inserido no banco principal (esperava 1, achei \$USER_COUNT)."
  docker exec \$DB_CONTAINER psql -U \$DB_USER -d postgres -c "DROP DATABASE IF EXISTS \$TEMP_DB;" >/dev/null
  exit 1
fi

echo ""
echo "→ Migracao completa. Contagem no banco principal (\$DB_MAIN):"
docker exec \$DB_CONTAINER psql -U \$DB_USER -d \$DB_MAIN -c "
SELECT
  (SELECT COUNT(*) FROM users WHERE id = '\$LOCAL_USER_ID') AS user_migrado,
  (SELECT COUNT(*) FROM categories WHERE user_id = '\$LOCAL_USER_ID') AS categorias,
  (SELECT COUNT(*) FROM cards WHERE user_id = '\$LOCAL_USER_ID') AS cartoes,
  (SELECT COUNT(*) FROM monthly_references WHERE user_id = '\$LOCAL_USER_ID') AS ref_mensais,
  (SELECT COUNT(*) FROM transactions WHERE user_id = '\$LOCAL_USER_ID') AS transacoes;
"

# Limpa
docker exec \$DB_CONTAINER psql -U \$DB_USER -d postgres -c "DROP DATABASE IF EXISTS \$TEMP_DB;" >/dev/null
rm -f $REMOTE_DUMP

REMOTE_SCRIPT

echo ""
echo "✓ Migracao de $EMAIL concluida com sucesso."
echo "  O dump local foi mantido em $DUMP_FILE (pode apagar quando quiser)."
