#!/usr/bin/env bash
# Troca `service-template` pelo nome do novo serviço em todo o repo
# (exceto .git, node_modules, dist e coverage). Funciona em macOS e Linux.
# Uso: scripts/rename-service.sh billing-service
set -euo pipefail

NOVO="${1:-}"
if [[ ! "$NOVO" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Uso: $0 <nome-do-servico>  (minúsculas, números e hífen)" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

grep -rIl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist \
  --exclude-dir=coverage --exclude=package-lock.json 'service-template' . \
  | while IFS= read -r arquivo; do
      NOVO="$NOVO" perl -pi -e 's/service-template/$ENV{NOVO}/g' "$arquivo"
    done

# O package-lock tem o nome só nas duas primeiras entradas; troca só ali.
if [[ -f package-lock.json ]]; then
  NOVO="$NOVO" perl -pi -e 's/"name": "service-template"/"name": "$ENV{NOVO}"/ if $. <= 12' package-lock.json
fi

# O nome novo muda o tamanho das linhas, e o prettier (checado no Lint da CI)
# passa a querer quebrá-las ou juntá-las de outro jeito.
if [[ -x node_modules/.bin/prettier ]]; then
  npm run --silent format
else
  echo "Rode 'npm install && npm run format' antes de commitar." >&2
fi

echo "Renomeado para '$NOVO'."
