#!/bin/bash

# Script para ejecutar el scraper de Fortnite con cron
# Este script se ejecutará automáticamente cada día

# Configurar variables
PROJECT_DIR="/Users/USER/Desktop/Projects/freelancer/web-scrapping"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/cron-scraper-$TIMESTAMP.log"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR"

# Ejecutar el scraper con proxy aleatorio y guardar logs
echo "🚀 Iniciando scraper de Fortnite - $(date)" >> "$LOG_FILE"
echo "📁 Directorio: $PROJECT_DIR" >> "$LOG_FILE"
echo "📝 Log: $LOG_FILE" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"

# Ejecutar el scraper (usa proxy aleatorio por defecto)
bun run final-combined-scraper.ts >> "$LOG_FILE" 2>&1

# Verificar si el scraping fue exitoso
if [ $? -eq 0 ]; then
    echo "✅ Scraping completado exitosamente - $(date)" >> "$LOG_FILE"
    
    # Generar JSON limpio
    echo "🧹 Generando JSON limpio..." >> "$LOG_FILE"
    bun run clean-json-generator.ts >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ JSON limpio generado exitosamente - $(date)" >> "$LOG_FILE"
        
        # Extraer colores de los productos
        echo "🎨 Extrayendo colores de los productos..." >> "$LOG_FILE"
        bun run execute-color-extraction.ts >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ Colores extraídos exitosamente - $(date)" >> "$LOG_FILE"
            echo "🎉 Proceso completo finalizado exitosamente - $(date)" >> "$LOG_FILE"
        else
            echo "⚠️ Error extrayendo colores, pero el scraping fue exitoso - $(date)" >> "$LOG_FILE"
        fi
    else
        echo "⚠️ Error generando JSON limpio, pero el scraping fue exitoso - $(date)" >> "$LOG_FILE"
    fi
    
    # Enviar notificación (opcional)
    # echo "Fortnite scraper completado exitosamente" | mail -s "Scraper Success" tu-email@ejemplo.com
else
    echo "❌ Error en el scraping - $(date)" >> "$LOG_FILE"
    
    # Enviar notificación de error (opcional)
    # echo "Error en el scraper de Fortnite" | mail -s "Scraper Error" tu-email@ejemplo.com
fi

echo "===========================================" >> "$LOG_FILE"
echo "🏁 Finalizado - $(date)" >> "$LOG_FILE"
