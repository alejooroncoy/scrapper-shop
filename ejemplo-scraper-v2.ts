#!/usr/bin/env bun

/**
 * Ejemplo de uso del Final Combined Scraper v2.0
 * Demuestra las nuevas funcionalidades y configuraciones
 */

import { FinalCombinedScraper, Logger } from './final-combined-scraper';

async function ejemploBasico() {
  console.log('🔍 Ejemplo Básico - Scraper v2.0\n');
  
  const scraper = new FinalCombinedScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
  
  try {
    // Configurar proxy aleatorio
    scraper.setProxy(undefined, true);
    
    const resultado = await scraper.scrapeTiendaCompleta(url);
    
    if (resultado.success && resultado.data) {
      console.log('✅ Scraping exitoso!');
      console.log(`⏱️ Duración: ${(resultado.duration / 1000).toFixed(2)}s`);
      console.log(`📦 Productos: ${resultado.data.totalProducts}`);
      console.log(`🆔 OfferIds: ${resultado.data.totalOfferIds}`);
      
      // Guardar con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await scraper.guardarDatos(resultado.data, `ejemplo_basico_${timestamp}.json`);
    } else {
      console.error('❌ Error:', resultado.error);
    }
  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

async function ejemploAvanzado() {
  console.log('🚀 Ejemplo Avanzado - Configuración Personalizada\n');
  
  // Configuración personalizada
  const scraper = new FinalCombinedScraper({
    timeout: 120000,           // 2 minutos
    retryAttempts: 5,          // 5 reintentos
    delayBetweenRequests: 3000, // 3 segundos entre intentos
    logLevel: 'debug',         // Logging detallado
    headless: false,           // Modo visible para debugging
    useProxy: true
  });
  
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
  
  try {
    // Usar proxy específico
    scraper.setProxy(0); // Primer proxy
    
    console.log('🔧 Configuración aplicada:');
    console.log(`   Timeout: ${scraper.getPerformanceStats().config.timeout}ms`);
    console.log(`   Reintentos: ${scraper.getPerformanceStats().config.retryAttempts}`);
    console.log(`   Delay: ${scraper.getPerformanceStats().config.delayBetweenRequests}ms`);
    console.log(`   Log Level: ${scraper.getPerformanceStats().config.logLevel}`);
    console.log(`   Headless: ${scraper.getPerformanceStats().config.headless}`);
    console.log(`   Proxy: ${scraper.getProxyInfo()}\n`);
    
    const resultado = await scraper.scrapeTiendaCompleta(url);
    
    if (resultado.success && resultado.data) {
      console.log('✅ Scraping avanzado completado!');
      
      // Mostrar estadísticas detalladas
      console.log('\n📊 ESTADÍSTICAS DETALLADAS:');
      console.log('============================');
      console.log(`⏱️ Duración total: ${(resultado.duration / 1000).toFixed(2)}s`);
      console.log(`🔄 Intentos realizados: ${resultado.attempts}`);
      console.log(`🌐 Proxy usado: ${resultado.proxyUsed || 'Ninguno'}`);
      console.log(`📦 Productos encontrados: ${resultado.data.totalProducts}`);
      console.log(`🆔 OfferIds extraídos: ${resultado.data.totalOfferIds}`);
      console.log(`📋 Categorías: ${resultado.data.categories.length}`);
      console.log(`📅 Fecha: ${new Date(resultado.data.scrapingDate).toLocaleString('es-ES')}`);
      console.log(`🔧 Versión: ${resultado.data.version}`);
      
      // Calcular métricas de rendimiento
      const productosPorSegundo = resultado.data.totalProducts / (resultado.duration / 1000);
      const offerIdsPorSegundo = resultado.data.totalOfferIds / (resultado.duration / 1000);
      
      console.log(`\n⚡ RENDIMIENTO:`);
      console.log(`   Productos/segundo: ${productosPorSegundo.toFixed(2)}`);
      console.log(`   OfferIds/segundo: ${offerIdsPorSegundo.toFixed(2)}`);
      
      // Mostrar resumen por categorías
      console.log(`\n📂 CATEGORÍAS:`);
      resultado.data.categories.forEach((categoria, index) => {
        console.log(`   ${index + 1}. ${categoria.name}: ${categoria.products.length} productos`);
      });
      
      // Guardar datos
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await scraper.guardarDatos(resultado.data, `ejemplo_avanzado_${timestamp}.json`);
      console.log(`\n💾 Datos guardados en: ejemplo_avanzado_${timestamp}.json`);
      
    } else {
      console.error('❌ Error en scraping avanzado:', resultado.error);
    }
  } catch (error) {
    console.error('❌ Error crítico en scraping avanzado:', error);
  }
}

async function ejemploConReintentos() {
  console.log('🔄 Ejemplo con Reintentos - Simulación de Errores\n');
  
  // Configuración para demostrar reintentos
  const scraper = new FinalCombinedScraper({
    timeout: 30000,            // Timeout corto para forzar errores
    retryAttempts: 3,          // 3 reintentos
    delayBetweenRequests: 2000, // 2 segundos entre intentos
    logLevel: 'info',          // Logging normal
    headless: true
  });
  
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
  
  try {
    // Usar proxy aleatorio
    scraper.setProxy(undefined, true);
    
    console.log('🔄 Iniciando scraping con configuración de reintentos...');
    console.log(`   Timeout: ${scraper.getPerformanceStats().config.timeout}ms`);
    console.log(`   Reintentos: ${scraper.getPerformanceStats().config.retryAttempts}`);
    console.log(`   Delay: ${scraper.getPerformanceStats().config.delayBetweenRequests}ms\n`);
    
    const resultado = await scraper.scrapeTiendaCompleta(url);
    
    if (resultado.success && resultado.data) {
      console.log('✅ Scraping con reintentos exitoso!');
      console.log(`🔄 Intentos necesarios: ${resultado.attempts}`);
      console.log(`⏱️ Duración total: ${(resultado.duration / 1000).toFixed(2)}s`);
    } else {
      console.error('❌ Scraping falló después de todos los reintentos:', resultado.error);
    }
  } catch (error) {
    console.error('❌ Error crítico:', error);
  }
}

async function ejemploLogging() {
  console.log('📝 Ejemplo de Logging - Diferentes Niveles\n');
  
  // Probar diferentes niveles de logging
  const niveles = ['error', 'warn', 'info', 'debug'];
  
  for (const nivel of niveles) {
    console.log(`\n🔍 Probando nivel de log: ${nivel.toUpperCase()}`);
    console.log('='.repeat(40));
    
    const scraper = new FinalCombinedScraper({
      logLevel: nivel,
      headless: true,
      timeout: 30000
    });
    
    // Simular algunas operaciones para ver los logs
    scraper.setProxy(undefined, true);
    
    // Solo hacer una operación rápida para demostrar logging
    const stats = scraper.getPerformanceStats();
    console.log(`Configuración cargada con nivel: ${stats.config.logLevel}`);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--avanzado') || args.includes('-a')) {
    await ejemploAvanzado();
  } else if (args.includes('--reintentos') || args.includes('-r')) {
    await ejemploConReintentos();
  } else if (args.includes('--logging') || args.includes('-l')) {
    await ejemploLogging();
  } else {
    await ejemploBasico();
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main().catch(console.error);
}

export { ejemploBasico, ejemploAvanzado, ejemploConReintentos, ejemploLogging };
