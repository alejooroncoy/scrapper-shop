#!/bin/bash

# Script para actualizar datos de Fortnite usando la API
# Este script se ejecutará automáticamente cada día usando la API REST

# Configurar variables
PROJECT_DIR="/Users/USER/Desktop/Projects/freelancer/web-scrapping"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/cron-scraper-$TIMESTAMP.log"
API_URL="http://localhost:3009/api/fortnite-shop/update"
HEALTH_URL="http://localhost:3009/api/health"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR"

# Función para verificar si la API está disponible
check_api_health() {
    echo "🔍 Verificando estado de la API..." >> "$LOG_FILE"
    local health_response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$HEALTH_URL" 2>/dev/null)
    local http_code="${health_response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ API está disponible y funcionando" >> "$LOG_FILE"
        return 0
    else
        echo "❌ API no está disponible (HTTP $http_code)" >> "$LOG_FILE"
        return 1
    fi
}

# Función para iniciar la API si no está corriendo
start_api_if_needed() {
    echo "🚀 Verificando si la API está corriendo..." >> "$LOG_FILE"
    
    if ! check_api_health; then
        echo "🔄 Iniciando servidor API..." >> "$LOG_FILE"
        echo "🔧 Comando: bun run server.ts" >> "$LOG_FILE"
        
        # Iniciar la API en background
        nohup bun run server.ts > "$LOG_DIR/api-server-$TIMESTAMP.log" 2>&1 &
        local api_pid=$!
        echo "📝 PID del servidor API: $api_pid" >> "$LOG_FILE"
        
        # Esperar a que la API esté lista (máximo 60 segundos)
        echo "⏳ Esperando a que la API esté lista..." >> "$LOG_FILE"
        local attempts=0
        local max_attempts=30
        
        while [ $attempts -lt $max_attempts ]; do
            if check_api_health; then
                echo "✅ API iniciada exitosamente después de $((attempts * 2)) segundos" >> "$LOG_FILE"
                return 0
            fi
            sleep 2
            attempts=$((attempts + 1))
        done
        
        echo "❌ No se pudo iniciar la API después de 60 segundos" >> "$LOG_FILE"
        return 1
    else
        echo "✅ API ya está corriendo" >> "$LOG_FILE"
        return 0
    fi
}

# Ejecutar el proceso de actualización usando la API
echo "🚀 Iniciando actualización de Fortnite via API - $(date)" >> "$LOG_FILE"
echo "📁 Directorio: $PROJECT_DIR" >> "$LOG_FILE"
echo "📝 Log: $LOG_FILE" >> "$LOG_FILE"
echo "🌐 API URL: $API_URL" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"

# Verificar/iniciar la API
if ! start_api_if_needed; then
    echo "❌ No se pudo iniciar la API - $(date)" >> "$LOG_FILE"
    echo "===========================================" >> "$LOG_FILE"
    echo "🏁 Finalizado con error - $(date)" >> "$LOG_FILE"
    exit 1
fi

# Ejecutar actualización via API
echo "🔄 Solicitando actualización via API..." >> "$LOG_FILE"
echo "🔧 Comando: curl -X POST $API_URL" >> "$LOG_FILE"
echo "⏰ Iniciando actualización..." >> "$LOG_FILE"

# Realizar la petición POST a la API
local update_response=$(curl -s -w "%{http_code}" -o /tmp/update_response.json -X POST "$API_URL" 2>/dev/null)
local http_code="${update_response: -3}"

# Verificar si la actualización fue exitosa
if [ "$http_code" = "200" ]; then
    echo "✅ Actualización completada exitosamente - $(date)" >> "$LOG_FILE"
    echo "🌐 Método: API REST con proxy aleatorio automático" >> "$LOG_FILE"
    
    # Mostrar respuesta de la API
    if [ -f "/tmp/update_response.json" ]; then
        echo "📄 Respuesta de la API:" >> "$LOG_FILE"
        cat /tmp/update_response.json >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
    fi
    
    # Verificar estado final de la API
    echo "🔍 Verificando estado final de la API..." >> "$LOG_FILE"
    if check_api_health; then
        echo "✅ API funcionando correctamente después de la actualización" >> "$LOG_FILE"
        echo "🎉 Proceso completo finalizado exitosamente - $(date)" >> "$LOG_FILE"
    else
        echo "⚠️ API puede tener problemas después de la actualización" >> "$LOG_FILE"
    fi
    
    # Enviar notificación (opcional)
    # echo "Fortnite API actualizada exitosamente" | mail -s "API Update Success" tu-email@ejemplo.com
else
    echo "❌ Error en la actualización via API (HTTP $http_code) - $(date)" >> "$LOG_FILE"
    echo "🌐 Método: API REST (puede haber fallado)" >> "$LOG_FILE"
    
    # Mostrar respuesta de error si existe
    if [ -f "/tmp/update_response.json" ]; then
        echo "📄 Respuesta de error de la API:" >> "$LOG_FILE"
        cat /tmp/update_response.json >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
    fi
    
    # Enviar notificación de error (opcional)
    # echo "Error en la actualización de la API de Fortnite" | mail -s "API Update Error" tu-email@ejemplo.com
fi

# Limpiar archivos temporales
rm -f /tmp/health_response.json /tmp/update_response.json

echo "===========================================" >> "$LOG_FILE"
echo "🏁 Finalizado - $(date)" >> "$LOG_FILE"
