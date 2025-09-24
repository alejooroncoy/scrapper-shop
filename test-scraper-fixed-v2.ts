#!/usr/bin/env bun

/**
 * Script de prueba mejorado que corrige el problema de categorización
 * Basado en el diagnóstico exitoso
 */

import { FinalCombinedScraper } from './final-combined-scraper';
import { CleanJsonGenerator } from './clean-json-generator';

async function testScraperFixed() {
  console.log('🧪 Iniciando prueba del scraper corregido...\n');
  
  let scraper: FinalCombinedScraper | null = null;
  
  try {
    // Configurar scraper con configuración robusta
    scraper = new FinalCombinedScraper({
      timeout: 120000,
      retryAttempts: 3,
      delayBetweenRequests: 3000,
      headless: true,
      logLevel: 'info'
    });
    
    // Configurar proxy aleatorio
    scraper.setProxy(undefined, true);
    
    console.log('📋 Configuración del scraper:');
    console.log(`   - Timeout: 120s`);
    console.log(`   - Reintentos: 3`);
    console.log(`   - Delay entre intentos: 3s`);
    console.log(`   - Proxy: Aleatorio`);
    console.log(`   - Headless: true\n`);
    
    // Ejecutar scraping
    const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
    console.log(`🌐 URL objetivo: ${url}\n`);
    
    const resultado = await scraper.scrapeTiendaCompleta(url);
    
    if (resultado.success && resultado.data) {
      console.log('\n✅ Scraping exitoso!');
      console.log(`📊 Estadísticas:`);
      console.log(`   - Duración: ${(resultado.duration / 1000).toFixed(2)}s`);
      console.log(`   - Intentos: ${resultado.attempts}`);
      console.log(`   - Proxy usado: ${resultado.proxyUsed || 'Ninguno'}`);
      console.log(`   - Categorías: ${resultado.data.categories.length}`);
      console.log(`   - Productos: ${resultado.data.totalProducts}`);
      console.log(`   - OfferIds: ${resultado.data.totalOfferIds}`);
      
      // Verificar específicamente categorías con "Invencible"
      const categoriasInvencible = resultado.data.categories.filter(cat => 
        cat.name.toLowerCase().includes('invencible')
      );
      
      const productosInvencible = resultado.data.categories.flatMap(cat => 
        cat.products.filter(prod => 
          prod.name.toLowerCase().includes('invencible')
        )
      );
      
      console.log('\n🎯 VERIFICACIÓN ESPECÍFICA DE "INVENCIBLE":');
      console.log('==========================================');
      console.log(`Categorías con "Invencible": ${categoriasInvencible.length}`);
      console.log(`Productos con "Invencible": ${productosInvencible.length}`);
      
      if (categoriasInvencible.length > 0) {
        console.log('\n✅ ¡CATEGORÍAS CON "INVENCIBLE" ENCONTRADAS!');
        categoriasInvencible.forEach((cat, index) => {
          console.log(`   ${index + 1}. "${cat.name}" - ${cat.products.length} productos`);
        });
      }
      
      if (productosInvencible.length > 0) {
        console.log('\n✅ ¡PRODUCTOS CON "INVENCIBLE" ENCONTRADOS!');
        productosInvencible.forEach((prod, index) => {
          console.log(`   ${index + 1}. ${prod.name} - ${prod.vbucks} VBucks (${prod.type})`);
        });
      }
      
      // Mostrar todas las categorías para verificar
      console.log('\n📋 TODAS LAS CATEGORÍAS ENCONTRADAS:');
      console.log('===================================');
      resultado.data.categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. "${cat.name}" - ${cat.products.length} productos`);
      });
      
      // Guardar datos
      await scraper.guardarDatos(resultado.data, 'fortnite_shop_latest.json');
      console.log('\n💾 Datos guardados en fortnite_shop_latest.json');
      
      // Probar generación de JSON limpio
      console.log('\n🧹 Probando generación de JSON limpio...');
      const generator = new CleanJsonGenerator();
      await generator.generarJsonLimpio();
      console.log('✅ JSON limpio generado exitosamente');
      
      // RESULTADO FINAL
      if (categoriasInvencible.length > 0 || productosInvencible.length > 0) {
        console.log('\n🎉 ¡VALIDACIÓN EXITOSA! El scraper SÍ devuelve categorías/productos con "Invencible"');
      } else {
        console.log('\n❌ VALIDACIÓN FALLIDA: No se encontraron categorías/productos con "Invencible"');
      }
      
    } else {
      console.error('\n❌ Error en el scraping:', resultado.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error crítico en la prueba:', error);
    process.exit(1);
  } finally {
    // Cerrar recursos
    if (scraper) {
      await scraper.cerrar();
    }
  }
}

// Ejecutar prueba
if (import.meta.main) {
  testScraperFixed();
}

export { testScraperFixed };
