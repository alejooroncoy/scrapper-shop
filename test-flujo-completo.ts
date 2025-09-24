import { exec } from 'child_process';
import { promisify } from 'util';
import { CleanJsonGenerator } from './clean-json-generator';
import { ejecutarExtraccionColores } from './server';

const execAsync = promisify(exec);

async function testFlujoCompleto() {
  try {
    console.log('🧪 Iniciando prueba del flujo completo...\n');
    
    // Paso 1: Ejecutar el scraper
    console.log('📦 Paso 1: Ejecutando scraper final...');
    await execAsync('bun run final-combined-scraper.ts');
    console.log('✅ Scraper ejecutado exitosamente\n');
    
    // Paso 2: Generar JSON limpio
    console.log('🧹 Paso 2: Generando JSON limpio...');
    const generator = new CleanJsonGenerator();
    await generator.generarJsonLimpio();
    console.log('✅ JSON limpio generado exitosamente\n');
    
    // Paso 3: Extraer colores
    console.log('🎨 Paso 3: Extrayendo colores...');
    await ejecutarExtraccionColores();
    console.log('✅ Colores extraídos exitosamente\n');
    
    // Paso 4: Verificar resultados
    console.log('🔍 Paso 4: Verificando resultados...');
    const fs = await import('fs');
    const cleanData = JSON.parse(fs.readFileSync('fortnite_shop_clean.json', 'utf8'));
    
    let productosConColores = 0;
    let totalProductos = 0;
    
    cleanData.categories.forEach((categoria: any) => {
      categoria.products.forEach((producto: any) => {
        totalProductos++;
        if (producto.color1 || producto.color2 || producto.color3) {
          productosConColores++;
        }
      });
    });
    
    console.log(`📊 Resultados:`);
    console.log(`   Total productos: ${totalProductos}`);
    console.log(`   Productos con colores: ${productosConColores}`);
    console.log(`   Porcentaje con colores: ${((productosConColores / totalProductos) * 100).toFixed(1)}%`);
    
    if (productosConColores > 0) {
      console.log('\n🎉 ¡Flujo completo funcionando correctamente!');
      console.log('✅ Los colores se están extrayendo y agregando al JSON limpio');
    } else {
      console.log('\n⚠️ No se encontraron productos con colores');
      console.log('🔍 Revisar la función de extracción de colores');
    }
    
  } catch (error) {
    console.error('❌ Error en el flujo completo:', error);
  }
}

// Ejecutar la prueba
testFlujoCompleto();
