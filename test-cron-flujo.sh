#!/bin/bash

# Script para probar el flujo completo del cron con extracción de colores
# Este script simula lo que haría el cron job

# Configurar variables
PROJECT_DIR="/Users/USER/Desktop/Projects/freelancer/web-scrapping"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/test-cron-$TIMESTAMP.log"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Cambiar al directorio del proyecto
cd "$PROJECT_DIR"

echo "🧪 Iniciando prueba del flujo completo del cron - $(date)" | tee "$LOG_FILE"
echo "📁 Directorio: $PROJECT_DIR" | tee -a "$LOG_FILE"
echo "📝 Log: $LOG_FILE" | tee -a "$LOG_FILE"
echo "===========================================" | tee -a "$LOG_FILE"

# Ejecutar el scraper (usa proxy aleatorio por defecto)
echo "📦 Ejecutando scraper final..." | tee -a "$LOG_FILE"
bun run final-combined-scraper.ts >> "$LOG_FILE" 2>&1

# Verificar si el scraping fue exitoso
if [ $? -eq 0 ]; then
    echo "✅ Scraping completado exitosamente - $(date)" | tee -a "$LOG_FILE"
    
    # Generar JSON limpio
    echo "🧹 Generando JSON limpio..." | tee -a "$LOG_FILE"
    bun run clean-json-generator.ts >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ JSON limpio generado exitosamente - $(date)" | tee -a "$LOG_FILE"
        
        # Extraer colores de los productos
        echo "🎨 Extrayendo colores de los productos..." | tee -a "$LOG_FILE"
        bun run execute-color-extraction.ts >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ Colores extraídos exitosamente - $(date)" | tee -a "$LOG_FILE"
            
            # Verificar resultados
            echo "🔍 Verificando resultados..." | tee -a "$LOG_FILE"
            node -e "
                const fs = require('fs');
                try {
                    const data = JSON.parse(fs.readFileSync('fortnite_shop_clean.json', 'utf8'));
                    let productosConColores = 0;
                    let totalProductos = 0;
                    
                    data.categories.forEach(categoria => {
                        categoria.products.forEach(producto => {
                            totalProductos++;
                            if (producto.color1 || producto.color2 || producto.color3) {
                                productosConColores++;
                            }
                        });
                    });
                    
                    console.log(\`📊 Resultados:\`);
                    console.log(\`   Total productos: \${totalProductos}\`);
                    console.log(\`   Productos con colores: \${productosConColores}\`);
                    console.log(\`   Porcentaje con colores: \${((productosConColores / totalProductos) * 100).toFixed(1)}%\`);
                    
                    if (productosConColores > 0) {
                        console.log('🎉 ¡Flujo completo funcionando correctamente!');
                    } else {
                        console.log('⚠️ No se encontraron productos con colores');
                    }
                } catch (error) {
                    console.error('❌ Error verificando resultados:', error.message);
                }
            " | tee -a "$LOG_FILE"
            
            echo "🎉 Proceso completo finalizado exitosamente - $(date)" | tee -a "$LOG_FILE"
        else
            echo "⚠️ Error extrayendo colores, pero el scraping fue exitoso - $(date)" | tee -a "$LOG_FILE"
        fi
    else
        echo "⚠️ Error generando JSON limpio, pero el scraping fue exitoso - $(date)" | tee -a "$LOG_FILE"
    fi
else
    echo "❌ Error en el scraping - $(date)" | tee -a "$LOG_FILE"
fi

echo "===========================================" | tee -a "$LOG_FILE"
echo "🏁 Prueba finalizada - $(date)" | tee -a "$LOG_FILE"

# Mostrar resumen
echo ""
echo "📋 RESUMEN DE LA PRUEBA:"
echo "========================"
echo "📝 Log completo: $LOG_FILE"
echo "📁 Archivos generados:"
echo "   • fortnite_shop_latest.json (si existe)"
echo "   • fortnite_shop_clean.json"
echo ""
echo "🔍 Para ver el log completo:"
echo "   cat $LOG_FILE"
echo ""
echo "🔍 Para ver los últimos logs:"
echo "   tail -f $LOG_FILE"
