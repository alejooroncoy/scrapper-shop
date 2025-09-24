#!/usr/bin/env bun

/**
 * Script de prueba para el scraper mejorado
 * Este script prueba las mejoras implementadas para solucionar los errores de PM2
 */

import { FinalCombinedScraper } from './final-combined-scraper';
import { CleanJsonGenerator } from './clean-json-generator';

async function testScraper() {
  console.log('🧪 Iniciando prueba del scraper mejorado...\n');
  
  let scraper: FinalCombinedScraper | null = null;
  
  try {
    // Configurar scraper con configuración robusta
    scraper = new FinalCombinedScraper({
      timeout: 120000, // 2 minutos
      retryAttempts: 3, // 3 intentos
      delayBetweenRequests: 3000, // 3 segundos entre intentos
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
      
      // Guardar datos
      await scraper.guardarDatos(resultado.data, 'fortnite_shop_latest.json');
      console.log('\n💾 Datos guardados en fortnite_shop_latest.json');
      
      // Probar generación de JSON limpio
      console.log('\n🧹 Probando generación de JSON limpio...');
      const generator = new CleanJsonGenerator();
      await generator.generarJsonLimpio();
      console.log('✅ JSON limpio generado exitosamente');
      
      console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
      
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
  testScraper();
}

export { testScraper };
