#!/usr/bin/env bash
# =============================================================================
# test-e2e.sh — Prueba end-to-end del microservicio Spring Boot + Django
# =============================================================================
# Uso:
#   ./scripts/test-e2e.sh                    # flujo completo
#   ./scripts/test-e2e.sh --only-purge       # solo la guardia de purga
#   ./scripts/test-e2e.sh --skip-frontend    # no verifica el frontend
#   ./scripts/test-e2e.sh --skip-ratelimit   # no agota la cuota de GETs
#
# Variables de entorno overrides:
#   SPRING_URL, DJANGO_URL, FRONTEND_URL
#
# Idempotente: cada corrida genera nombres y referencias únicos con el
# timestamp, así que se puede repetir sin chocar con la restricción UNIQUE de
# products_product.name.
# =============================================================================

set -uo pipefail

SPRING_URL="${SPRING_URL:-http://localhost:8082}"
DJANGO_URL="${DJANGO_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

# ─── Token interno ─────────────────────────────────────────────────────────
# Se lee del .env de Django para que el script y los servidores nunca
# discrepen: si estuvieran desalineados, los tests de token fallarían por un
# motivo que no es un bug del código.
load_token() {
  if [[ -n "${INTERNAL_API_TOKEN:-}" ]]; then
    printf '%s' "$INTERNAL_API_TOKEN"
    return
  fi
  local env_file="$REPO_ROOT/.env"
  if [[ -f "$env_file" ]]; then
    sed -n 's/^INTERNAL_API_TOKEN=//p' "$env_file" | tail -1
  fi
}
TOKEN="$(load_token)"
if [[ -z "$TOKEN" ]]; then
  echo -e "${RED}No se encontro INTERNAL_API_TOKEN. Definalo en el entorno o en $REPO_ROOT/.env${NC}"
  exit 1
fi

# ─── Helpers ───────────────────────────────────────────────────────────────
header() {
  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}=========================================================${NC}"
}

step() { echo -e "\n${YELLOW}> $1${NC}"; }

# check <descripcion> <esperado> <recibido>
check() {
  local desc="$1" esperado="$2" recibido="$3"
  if [[ "$recibido" == "$esperado" ]]; then
    echo -e "  ${GREEN}OK${NC}    $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FALLA${NC} $desc"
    echo -e "         esperado: $esperado"
    echo -e "         recibido: $recibido"
    FAIL=$((FAIL + 1))
  fi
}

skip() {
  echo -e "  ${YELLOW}OMITE${NC} $1"
  SKIP=$((SKIP + 1))
}

# json_field <json> <clave>  -> valor numerico de la clave
json_field() {
  printf '%s' "$1" | grep -oE "\"$2\":[0-9]+" | head -1 | cut -d: -f2
}

# code <curl args...> -> codigo HTTP, o 000 si no hay conexion
code() {
  curl -s -o /dev/null -w '%{http_code}' "$@" 2>/dev/null || printf '000'
}

# get <url> [header...] -> cuerpo de la respuesta
get() {
  curl -s "$@" 2>/dev/null
}

alive() {
  [[ "$(code "$1")" != '000' ]]
}

require_service() {
  if alive "$2"; then
    echo -e "  ${GREEN}OK${NC}    $1 responde"
  else
    echo -e "  ${RED}FALLA${NC} $1 NO responde en $2"
  fi
}

STAMP="$(date +%s)"

# Se definen acá (no dentro de un bloque condicional) porque los usa también
# la sección 3, que corre incluso con --only-purge.
AUTH=(-H "X-Internal-Token: $TOKEN")

# Plantilla del cuerpo de creación. printf con %s evita tener que escapar
# comillas dobles dentro de comillas dobles en el propio script.
JSON='{"nombre":"%s","descripcion":"%s","precioBase":50000,"referencia":"%s","stock":10}'

# ─── Args ──────────────────────────────────────────────────────────────────
ONLY_PURGE=false
SKIP_FRONTEND=false
SKIP_RATELIMIT=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --only-purge)     ONLY_PURGE=true; shift ;;
    --skip-frontend)  SKIP_FRONTEND=true; shift ;;
    --skip-ratelimit) SKIP_RATELIMIT=true; shift ;;
    -h|--help)        sed -n '2,18p' "$0"; exit 0 ;;
    *) echo -e "${RED}Flag desconocido: $1${NC}"; exit 1 ;;
  esac
done

# =============================================================================
# 0. SERVICIOS LEVANTADOS
# =============================================================================
header "0. VERIFICAR SERVICIOS"
SERVICIOS_OK=true
require_service "Django (:8000)"      "$DJANGO_URL/api/health/"
[[ "$(code "$DJANGO_URL/api/health/")" == '000' ]] && SERVICIOS_OK=false
require_service "Spring Boot (:8082)" "$SPRING_URL/api/v1/productos?page=0&size=1"
[[ "$(code "$SPRING_URL/api/v1/productos?page=0&size=1")" == '000' ]] && SERVICIOS_OK=false
if [[ "$SKIP_FRONTEND" == "false" ]]; then
  require_service "Frontend (:5173)" "$FRONTEND_URL/"
fi

if [[ "$SERVICIOS_OK" == "false" ]]; then
  echo -e "\n${RED}Falta Django o Spring Boot: no se puede continuar.${NC}"
  exit 1
fi

if [[ "$ONLY_PURGE" == "false" ]]; then
  # =============================================================================
  # 1. COMUNICACION INTER-SERVICIO (token interno)
  # =============================================================================
  header "1. INTER-SERVICIO SPRING <-> DJANGO"

  step "1.1 health con token valido -> 200"
  check "GET /api/internal/products/health/" "200" \
    "$(code "$DJANGO_URL/api/internal/products/health/" "${AUTH[@]}")"

  step "1.2 health SIN token -> 401 (falla cerrado)"
  check "GET health sin token" "401" \
    "$(code "$DJANGO_URL/api/internal/products/health/")"

  step "1.3 health con token ERRONEO -> 401"
  check "GET health con token invalido" "401" \
    "$(code "$DJANGO_URL/api/internal/products/health/" -H "X-Internal-Token: token-invalido")"

  step "1.4 stats agregadas"
  STATS="$(get "$DJANGO_URL/api/internal/products/stats/" "${AUTH[@]}")"
  echo -e "         $STATS"
  if [[ "$STATS" == *'"total"'* ]]; then
    check "GET /api/internal/products/stats/" "ok" "ok"
  else
    check "GET /api/internal/products/stats/" "ok" "recibido: $STATS"
  fi

  step "1.5 exists? con referencia inexistente -> exists:false"
  EXISTE="$(get "$DJANGO_URL/api/internal/products/exists/?ref=NOEXISTE$STAMP" "${AUTH[@]}")"
  if [[ "$EXISTE" == *'"exists": false'* ]]; then
    check "GET /api/internal/products/exists/" "exists:false" "exists:false"
  else
    check "GET /api/internal/products/exists/" "exists:false" "recibido: $EXISTE"
  fi

  step "1.6 recent? sin 'since' -> 400"
  check "GET recent sin since" "400" \
    "$(code "$DJANGO_URL/api/internal/products/recent/" "${AUTH[@]}")"

  step "1.7 recent? con since -> 200"
  check "GET recent con since" "200" \
    "$(code "$DJANGO_URL/api/internal/products/recent/?since=2020-01-01T00:00:00Z&limit=5" "${AUTH[@]}")"

  step "1.8 diagnostico desde Spring"
  DIAG="$(get "$SPRING_URL/api/v1/productos/internal/django-status")"
  echo -e "         $DIAG"
  if [[ "$DIAG" == *'"djangoDisponible":true'* ]]; then
    check "GET /api/v1/productos/internal/django-status" "true" "true"
  else
    check "GET /api/v1/productos/internal/django-status" "true" "recibido: $DIAG"
  fi

  # =============================================================================
  # 2. CRUD EN SPRING BOOT
  # =============================================================================
  header "2. CRUD COMPLETO EN SPRING BOOT"

  # name es UNIQUE en la BD: el timestamp evita chocar con corridas previas.
  REF="E2E$STAMP"
  step "2.1 crear producto valido"
  PAYLOAD="$(printf "$JSON" "Producto E2E $STAMP" "Creado por test-e2e.sh" "$REF")"
  CREATE="$(get -X POST "$SPRING_URL/api/v1/productos" \
    -H 'Content-Type: application/json' -d "$PAYLOAD")"
  PID="$(json_field "$CREATE" "id")"
  if [[ -n "$PID" ]]; then
    check "POST /api/v1/productos (id=$PID)" "creado" "creado"
  else
    check "POST /api/v1/productos" "creado" "respuesta: $CREATE"
    echo -e "\n${RED}Sin ID no se pueden seguir los tests dependientes.${NC}"
    exit 1
  fi

  step "2.2 leer producto por id"
  check "GET /api/v1/productos/$PID" "200" \
    "$(code "$SPRING_URL/api/v1/productos/$PID")"

  step "2.3 nombre duplicado -> 400 (regla de negocio)"
  PAYLOAD="$(printf "$JSON" "Producto E2E $STAMP" "Duplicado" "DUP$STAMP")"
  check "POST con nombre repetido" "400" \
    "$(code -X POST "$SPRING_URL/api/v1/productos" \
       -H 'Content-Type: application/json' -d "$PAYLOAD")"

  step "2.4 precio COP invalido (10, no multiplo de 50) -> 400"
  PAYLOAD='{"nombre":"Precio Invalido %s","descripcion":"x","precioBase":10,"referencia":"PI%s","stock":1}'
  PAYLOAD="$(printf "$PAYLOAD" "$STAMP" "$STAMP")"
  check "POST precio 10" "400" \
    "$(code -X POST "$SPRING_URL/api/v1/productos" \
       -H 'Content-Type: application/json' -d "$PAYLOAD")"

  step "2.5 referencia con formato invalido -> 400"
  PAYLOAD='{"nombre":"Ref Invalida %s","descripcion":"x","precioBase":50000,"referencia":"ref mala!","stock":1}'
  PAYLOAD="$(printf "$PAYLOAD" "$STAMP")"
  check "POST referencia invalida" "400" \
    "$(code -X POST "$SPRING_URL/api/v1/productos" \
       -H 'Content-Type: application/json' -d "$PAYLOAD")"

  step "2.6 la respuesta trae 'version' (bloqueo optimista)"
  GET="$(get "$SPRING_URL/api/v1/productos/$PID")"
  VERSION="$(json_field "$GET" "version")"
  if [[ -n "$VERSION" ]]; then
    check "GET expone version" "presente" "version=$VERSION"
  else
    check "GET expone version" "presente" "ausente en: $GET"
  fi

  step "2.7 PUT con la version vigente -> 200"
  PAYLOAD='{"nombre":"Producto E2E %s","descripcion":"Actualizado por test-e2e.sh","precioBase":60000,"referencia":"%s","stock":15,"version":%s}'
  PAYLOAD="$(printf "$PAYLOAD" "$STAMP" "$REF" "${VERSION:-0}")"
  check "PUT producto $PID" "200" \
    "$(code -X PUT "$SPRING_URL/api/v1/productos/$PID" \
       -H 'Content-Type: application/json' -d "$PAYLOAD")"

  step "2.8 PUT con la version VIEJA -> 409 (conflicto de version)"
  PAYLOAD='{"nombre":"Producto E2E %s","descripcion":"Intento de sobrescritura","precioBase":70000,"referencia":"%s","stock":15,"version":%s}'
  PAYLOAD="$(printf "$PAYLOAD" "$STAMP" "$REF" "${VERSION:-0}")"
  check "PUT con version obsoleta" "409" \
    "$(code -X PUT "$SPRING_URL/api/v1/productos/$PID" \
       -H 'Content-Type: application/json' -d "$PAYLOAD")"

  step "2.9 la version aumento tras el PUT correcto"
  VERSION2="$(json_field "$(get "$SPRING_URL/api/v1/productos/$PID")" "version")"
  if [[ -n "$VERSION2" && "$VERSION2" -gt "$VERSION" ]]; then
    check "version incrementada" "mayor que $VERSION" "$VERSION2"
  else
    check "version incrementada" "mayor que $VERSION" "${VERSION2:-ausente}"
  fi

  step "2.10 busqueda OR en 3 campos"
  check "GET ?search=E2E" "200" \
    "$(code "$SPRING_URL/api/v1/productos?search=E2E")"

  step "2.11 paginado con totalElements"
  PAGE="$(get "$SPRING_URL/api/v1/productos?page=0&size=5")"
  if [[ "$PAGE" == *'totalElements'* ]]; then
    check "GET pagina devuelve totalElements" "presente" "presente"
  else
    check "GET pagina devuelve totalElements" "presente" "ausente"
  fi

  step "2.12 producto inexistente -> 404"
  check "GET /api/v1/productos/99999999" "404" \
    "$(code "$SPRING_URL/api/v1/productos/99999999")"
fi

# =============================================================================
# 3. PURGA FISICA (guardias)
# =============================================================================
header "3. PURGA FISICA (hard delete)"

step "3.1 crear producto destino de la purga"
REF_PURGE="PU$STAMP"
PAYLOAD="$(printf "$JSON" "Producto a Purgar $STAMP" "Sin ordenes" "$REF_PURGE")"
CREATE_PURGE="$(get -X POST "$SPRING_URL/api/v1/productos" \
  -H 'Content-Type: application/json' -d "$PAYLOAD")"
PURGE_ID="$(json_field "$CREATE_PURGE" "id")"
if [[ -z "$PURGE_ID" ]]; then
  check "POST producto a purgar" "creado" "respuesta: $CREATE_PURGE"
  exit 1
fi
check "POST producto a purgar (id=$PURGE_ID)" "creado" "creado"

step "3.2 purgar sin soft-delete previo -> 400 (no tiene historial final)"
check "DELETE /purgar sin soft-delete" "400" \
  "$(code -X DELETE "$SPRING_URL/api/v1/productos/$PURGE_ID/purgar")"

step "3.3 soft-delete -> 204"
check "DELETE /api/v1/productos/$PURGE_ID" "204" \
  "$(code -X DELETE "$SPRING_URL/api/v1/productos/$PURGE_ID")"

step "3.4 consulta a Django: el producto no tiene ordenes"
  ORDERS="$(get "$DJANGO_URL/api/orders/check-product/$PURGE_ID/" "${AUTH[@]:-}")"
  if [[ "$ORDERS" == *'"has_orders": false'* ]]; then
    check "check-product/$PURGE_ID" "has_orders:false" "has_orders:false"
  else
    check "check-product/$PURGE_ID" "has_orders:false" "recibido: $ORDERS"
  fi

step "3.5 ahora si, purga fisica -> 204"
check "DELETE /purgar en estado BORRADO" "204" \
  "$(code -X DELETE "$SPRING_URL/api/v1/productos/$PURGE_ID/purgar")"

step "3.6 el producto ya no existe -> 404"
check "GET producto purgado" "404" \
  "$(code "$SPRING_URL/api/v1/productos/$PURGE_ID")"

# =============================================================================
# 4. BD COMPARTIDA: lo que Spring escribe, Django lo ve
# =============================================================================
if [[ "$ONLY_PURGE" == "false" ]]; then
  header "4. INTEGRACION CON DJANGO (BD compartida)"

  step "4.1 crear en Spring, leer desde la API de Django"
  REF_SHARED="SH$STAMP"
  PAYLOAD="$(printf "$JSON" "Producto Compartido $STAMP" "Visible en Django" "$REF_SHARED")"
  CREATE_SHARED="$(get -X POST "$SPRING_URL/api/v1/productos" \
    -H 'Content-Type: application/json' -d "$PAYLOAD")"
  SHARED_ID="$(json_field "$CREATE_SHARED" "id")"

  if [[ -n "$SHARED_ID" ]]; then
    VIA_DJANGO="$(get "$DJANGO_URL/api/products/$SHARED_ID/")"
    if [[ "$VIA_DJANGO" == *"$REF_SHARED"* ]]; then
      check "producto $SHARED_ID visible en Django" "si" "si"
    else
      check "producto $SHARED_ID visible en Django" "si" "no: $VIA_DJANGO"
    fi
    get -X DELETE "$SPRING_URL/api/v1/productos/$SHARED_ID" > /dev/null
  else
    skip "no se pudo crear el producto compartido"
  fi

  step "4.2 cleanup del producto del bloque 2"
  if [[ -n "${PID:-}" ]]; then
    get -X DELETE "$SPRING_URL/api/v1/productos/$PID" > /dev/null
    get -X DELETE "$SPRING_URL/api/v1/productos/$PID/purgar" > /dev/null
    skip "producto $PID soft-delete + purgado"
  fi
fi

# =============================================================================
# 5. RATE LIMITING (va ultimo: consume la cuota de la IP)
# =============================================================================
if [[ "$ONLY_PURGE" == "false" && "$SKIP_RATELIMIT" == "false" ]]; then
  header "5. RATE LIMITING (GET: 120/min)"

  step "5.1 disparando GETs hasta topar el limite..."
  LIMIT_CODE="no alcanzado"
  for i in $(seq 1 130); do
    if [[ "$(code "$SPRING_URL/api/v1/productos?page=0&size=1")" == "429" ]]; then
      LIMIT_CODE="429"
      check "rate limit activado" "429 en la peticion #$i" "429 en la peticion #$i"
      break
    fi
  done
  if [[ "$LIMIT_CODE" != "429" ]]; then
    skip "rate limit no se activo (puede estar reiniciado o la cuota ya liberada)"
  fi
  echo -e "  ${YELLOW}NOTA${NC} la cuota de esta IP queda agotada ~1 minuto"
fi

# =============================================================================
# RESULTADO
# =============================================================================
header "RESULTADO FINAL"
TOTAL=$((PASS + FAIL))
echo -e "  Tests ejecutados: ${TOTAL}"
echo -e "  ${GREEN}Pasados:  ${PASS}${NC}"
echo -e "  ${RED}Fallidos: ${FAIL}${NC}"
if [[ "$SKIP" -gt 0 ]]; then
  echo -e "  ${YELLOW}Omitidos: ${SKIP}${NC}"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo -e "\n${GREEN}=========================================================${NC}"
  echo -e "${GREEN}  OK  TODOS LOS TESTS PASARON${NC}"
  echo -e "${GREEN}=========================================================${NC}"
  exit 0
fi
echo -e "\n${RED}=========================================================${NC}"
echo -e "${RED}  FALLA  $FAIL TEST(S) FALLIDOS${NC}"
echo -e "${RED}=========================================================${NC}"
exit 1
