#!/bin/bash

# Script para probar el cron job inmediatamente
echo "🧪 Probando cron job de Fortnite scraper..."
echo "⏰ Fecha y hora: $(date)"
echo "==========================================="

# Ejecutar el script de cron
/Users/USER/Desktop/Projects/freelancer/web-scrapping/cron-scraper.sh

echo "==========================================="
echo "✅ Prueba de cron completada"
echo "📁 Revisa los logs en: /Users/USER/Desktop/Projects/freelancer/web-scrapping/logs/"
echo "📄 Último archivo JSON generado:"
ls -la /Users/USER/Desktop/Projects/freelancer/web-scrapping/fortnite_shop_*.json | tail -1
