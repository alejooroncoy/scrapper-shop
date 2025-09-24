#!/bin/bash

# Script de inicio mejorado para el scraper de Fortnite
# Este script maneja mejor los errores y reinicia el proceso si es necesario

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_DIR="/Users/USER/Desktop/Projects/freelancer/web-scrapping"
PROCESS_NAME="fortnite-scraper"
MAX_RESTARTS=5
RESTART_DELAY=10

# Función para logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para verificar si PM2 está instalado
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        error "PM2 no está instalado. Instalando..."
        npm install -g pm2
        success "PM2 instalado correctamente"
    else
        log "PM2 encontrado"
    fi
}

# Función para verificar si Bun está instalado
check_bun() {
    if ! command -v bun &> /dev/null; then
        error "Bun no está instalado. Instalando..."
        curl -fsSL https://bun.sh/install | bash
        success "Bun instalado correctamente"
    else
        log "Bun encontrado"
    fi
}

# Función para limpiar procesos anteriores
cleanup() {
    log "Limpiando procesos anteriores..."
    pm2 delete $PROCESS_NAME 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    success "Procesos anteriores limpiados"
}

# Función para instalar dependencias
install_dependencies() {
    log "Instalando dependencias..."
    cd $PROJECT_DIR
    bun install
    success "Dependencias instaladas"
}

# Función para crear directorio de logs
create_logs_dir() {
    log "Creando directorio de logs..."
    mkdir -p $PROJECT_DIR/logs
    success "Directorio de logs creado"
}

# Función para iniciar el proceso
start_process() {
    log "Iniciando proceso $PROCESS_NAME..."
    cd $PROJECT_DIR
    
    # Usar ecosystem.config.js si existe
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start "bun --hot server.ts" --name $PROCESS_NAME
    fi
    
    success "Proceso iniciado"
}

# Función para monitorear el proceso
monitor_process() {
    log "Monitoreando proceso..."
    local restart_count=0
    
    while [ $restart_count -lt $MAX_RESTARTS ]; do
        sleep 30
        
        # Verificar estado del proceso
        local status=$(pm2 jlist | jq -r ".[] | select(.name==\"$PROCESS_NAME\") | .status" 2>/dev/null || echo "errored")
        
        if [ "$status" = "errored" ] || [ "$status" = "stopped" ]; then
            warning "Proceso $PROCESS_NAME está en estado: $status"
            restart_count=$((restart_count + 1))
            
            if [ $restart_count -lt $MAX_RESTARTS ]; then
                warning "Reiniciando proceso ($restart_count/$MAX_RESTARTS)..."
                pm2 restart $PROCESS_NAME
                sleep $RESTART_DELAY
            else
                error "Límite de reinicios alcanzado ($MAX_RESTARTS)"
                break
            fi
        else
            log "Proceso funcionando correctamente (estado: $status)"
            restart_count=0  # Reset counter si todo está bien
        fi
    done
}

# Función para mostrar logs
show_logs() {
    log "Mostrando logs del proceso..."
    pm2 logs $PROCESS_NAME --lines 50
}

# Función para mostrar estado
show_status() {
    log "Estado del proceso:"
    pm2 status
    pm2 jlist | jq -r ".[] | select(.name==\"$PROCESS_NAME\") | {name, status, cpu, memory, uptime, restart}"
}

# Función principal
main() {
    log "🚀 Iniciando scraper de Fortnite mejorado..."
    
    # Verificaciones previas
    check_pm2
    check_bun
    create_logs_dir
    install_dependencies
    
    # Limpiar procesos anteriores
    cleanup
    
    # Iniciar proceso
    start_process
    
    # Mostrar estado inicial
    show_status
    
    # Mostrar logs iniciales
    log "Logs iniciales:"
    show_logs
    
    # Monitorear proceso
    monitor_process
}

# Manejo de argumentos
case "${1:-}" in
    "start")
        main
        ;;
    "stop")
        log "Deteniendo proceso..."
        pm2 stop $PROCESS_NAME
        success "Proceso detenido"
        ;;
    "restart")
        log "Reiniciando proceso..."
        pm2 restart $PROCESS_NAME
        success "Proceso reiniciado"
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "monitor")
        monitor_process
        ;;
    "clean")
        cleanup
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|status|logs|monitor|clean}"
        echo ""
        echo "Comandos disponibles:"
        echo "  start   - Iniciar el scraper"
        echo "  stop    - Detener el scraper"
        echo "  restart - Reiniciar el scraper"
        echo "  status  - Mostrar estado del scraper"
        echo "  logs    - Mostrar logs del scraper"
        echo "  monitor - Monitorear el scraper"
        echo "  clean   - Limpiar procesos anteriores"
        exit 1
        ;;
esac
