#!/usr/bin/env bun
// Script para probar que el cron job funciona con proxy aleatorio

import { FinalCombinedScraper } from './final-combined-scraper';
import { displayProxyInfo, getRandomProxy } from './proxy-config';

async function testCronWithProxy() {
  console.log('🧪 Probando configuración de cron con proxy aleatorio...\n');
  
  // Mostrar información de los proxies
  displayProxyInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  const scraper = new FinalCombinedScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    // Simular el comportamiento del cron job (sin argumentos = proxy aleatorio)
    console.log('🎲 Simulando ejecución de cron job (sin argumentos)...');
    console.log('📝 Esto debería usar proxy aleatorio por defecto\n');
    
    // No configurar proxy explícitamente - debería usar aleatorio por defecto
    // (esto simula lo que pasa cuando se ejecuta desde cron sin argumentos)
    
    const resultado = await scraper.scrapeTiendaCompleta(url);
    
    if (resultado.success && resultado.data) {
      const datos = resultado.data;
      console.log('\n✅ Prueba completada exitosamente!');
      console.log(`📊 Productos encontrados: ${datos.totalProducts}`);
      console.log(`📦 Categorías: ${datos.categories.length}`);
      console.log(`🆔 OfferId general: ${datos.offerId}`);
      
      // Mostrar resumen
      scraper.mostrarResumen(datos);
    } else {
      console.error('❌ Error en el scraping:', resultado.error);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await scraper.cerrar();
  }
}

async function testProxySelection() {
  console.log('🎯 Probando selección de proxies aleatorios...\n');
  
  for (let i = 0; i < 5; i++) {
    const proxy = getRandomProxy();
    console.log(`🎲 Prueba ${i + 1}: Proxy seleccionado`);
    console.log(`   Servidor: ${proxy.server}`);
    console.log(`   Usuario: ${proxy.username}`);
    console.log(`   Sesión: ${proxy.password.split('_session-')[1]?.split('_lifetime')[0] || 'N/A'}`);
    console.log('');
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-proxy-selection')) {
    await testProxySelection();
  } else {
    await testCronWithProxy();
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  main().catch(console.error);
}
