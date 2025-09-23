#!/bin/bash

# Script para verificar el estado del cron job de Fortnite scraper

echo "🔍 VERIFICACIÓN DEL CRON JOB DE FORTNITE SCRAPER"
echo "=============================================="
echo "⏰ Fecha y hora actual: $(date)"
echo ""

# Verificar si el cron job está configurado
echo "📋 CRON JOBS CONFIGURADOS:"
echo "-------------------------"
crontab -l | grep -E "(fortnite|scraper)" || echo "❌ No se encontraron cron jobs relacionados con Fortnite"
echo ""

# Verificar logs recientes
echo "📁 LOGS RECIENTES:"
echo "------------------"
LOG_DIR="/Users/USER/Desktop/Projects/freelancer/web-scrapping/logs"
if [ -d "$LOG_DIR" ]; then
    echo "📂 Directorio de logs: $LOG_DIR"
    echo "📄 Últimos 3 logs:"
    ls -la "$LOG_DIR"/*.log | tail -3
    echo ""
    
    # Mostrar estado del último log
    LATEST_LOG=$(ls -t "$LOG_DIR"/*.log | head -1)
    if [ -f "$LATEST_LOG" ]; then
        echo "📊 ESTADO DEL ÚLTIMO LOG:"
        echo "------------------------"
        echo "📄 Archivo: $(basename "$LATEST_LOG")"
        echo "📅 Fecha: $(stat -f "%Sm" "$LATEST_LOG")"
        echo "📏 Tamaño: $(du -h "$LATEST_LOG" | cut -f1)"
        echo ""
        
        # Verificar si fue exitoso
        if grep -q "✅ Scraping completado exitosamente" "$LATEST_LOG"; then
            echo "✅ Estado: ÉXITO"
        elif grep -q "❌ Error" "$LATEST_LOG"; then
            echo "❌ Estado: ERROR"
        else
            echo "⚠️ Estado: DESCONOCIDO"
        fi
        echo ""
        
        # Mostrar resumen del último log
        echo "📈 RESUMEN DEL ÚLTIMO SCRAPING:"
        echo "--------------------------------"
        grep -E "(Productos encontrados|Categorías|OfferId general|Duración total|Proxy usado)" "$LATEST_LOG" | tail -5
        echo ""
    fi
else
    echo "❌ No se encontró el directorio de logs"
fi

# Verificar archivos JSON generados
echo "📄 ARCHIVOS JSON GENERADOS:"
echo "---------------------------"
JSON_DIR="/Users/USER/Desktop/Projects/freelancer/web-scrapping"
if [ -d "$JSON_DIR" ]; then
    echo "📂 Directorio: $JSON_DIR"
    echo "📄 Últimos 3 archivos JSON:"
    ls -la "$JSON_DIR"/fortnite_shop_*.json | tail -3
    echo ""
    
    # Mostrar información del último archivo JSON
    LATEST_JSON=$(ls -t "$JSON_DIR"/fortnite_shop_*.json | head -1)
    if [ -f "$LATEST_JSON" ]; then
        echo "📊 INFORMACIÓN DEL ÚLTIMO JSON:"
        echo "--------------------------------"
        echo "📄 Archivo: $(basename "$LATEST_JSON")"
        echo "📅 Fecha: $(stat -f "%Sm" "$LATEST_JSON")"
        echo "📏 Tamaño: $(du -h "$LATEST_JSON" | cut -f1)"
        
        # Extraer información básica del JSON
        if command -v jq >/dev/null 2>&1; then
            echo "📊 Datos extraídos:"
            echo "   🛍️ Total productos: $(jq -r '.totalProducts // "N/A"' "$LATEST_JSON")"
            echo "   📦 Total categorías: $(jq -r '.categories | length // "N/A"' "$LATEST_JSON")"
            echo "   🆔 OfferId general: $(jq -r '.offerId // "N/A"' "$LATEST_JSON")"
            echo "   📅 Fecha scraping: $(jq -r '.scrapingDate // "N/A"' "$LATEST_JSON")"
        else
            echo "⚠️ jq no está instalado - no se puede extraer información del JSON"
        fi
    fi
else
    echo "❌ No se encontró el directorio del proyecto"
fi

echo ""
echo "=============================================="
echo "✅ Verificación completada"
echo "💡 Para ver logs en tiempo real: tail -f $LOG_DIR/cron-scraper-*.log"
echo "💡 Para ejecutar manualmente: ./cron-scraper.sh"
