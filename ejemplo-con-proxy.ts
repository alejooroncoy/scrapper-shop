#!/usr/bin/env bun
// Ejemplo de cómo usar el scraper con proxies

import { FinalCombinedScraper } from './final-combined-scraper';
import { displayProxyInfo, testProxy } from './proxy-config';

async function ejemploConProxy() {
  console.log('🚀 Ejemplo de uso del scraper con proxies\n');
  
  // Mostrar información de los proxies disponibles
  displayProxyInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  const scraper = new FinalCombinedScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    // Ejemplo 1: Usar proxy aleatorio
    console.log('🎲 Ejemplo 1: Usando proxy aleatorio...');
    scraper.setProxy(undefined, true);
    
    // Probar el proxy antes de usarlo
    const proxyIndex = Math.floor(Math.random() * 10);
    console.log(`🧪 Probando proxy ${proxyIndex + 1}...`);
    const proxyFunciona = await testProxy(proxyIndex);
    
    if (proxyFunciona) {
      console.log('✅ Proxy funcionando, iniciando scraping...\n');
      const datos1 = await scraper.scrapeTiendaCompleta(url);
      console.log(`📊 Scraping completado: ${datos1.totalProducts} productos encontrados\n`);
    } else {
      console.log('❌ Proxy no funciona, probando sin proxy...\n');
      scraper.disableProxy();
      const datos1 = await scraper.scrapeTiendaCompleta(url);
      console.log(`📊 Scraping completado: ${datos1.totalProducts} productos encontrados\n`);
    }

    // Ejemplo 2: Usar proxy específico
    console.log('🔐 Ejemplo 2: Usando proxy específico (proxy 1)...');
    scraper.setProxy(0); // Primer proxy
    
    const datos2 = await scraper.scrapeTiendaCompleta(url);
    console.log(`📊 Scraping completado: ${datos2.totalProducts} productos encontrados\n`);

    // Ejemplo 3: Sin proxy
    console.log('🌐 Ejemplo 3: Sin proxy...');
    scraper.disableProxy();
    
    const datos3 = await scraper.scrapeTiendaCompleta(url);
    console.log(`📊 Scraping completado: ${datos3.totalProducts} productos encontrados\n`);

    console.log('✅ Todos los ejemplos completados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el ejemplo:', error);
  } finally {
    await scraper.cerrar();
  }
}

// Función para probar todos los proxies
async function probarTodosLosProxies() {
  console.log('🧪 Probando todos los proxies...\n');
  
  for (let i = 0; i < 10; i++) {
    console.log(`🔍 Probando proxy ${i + 1}...`);
    const funciona = await testProxy(i);
    console.log(`${funciona ? '✅' : '❌'} Proxy ${i + 1}: ${funciona ? 'Funciona' : 'No funciona'}\n`);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-all')) {
    await probarTodosLosProxies();
  } else {
    await ejemploConProxy();
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  main().catch(console.error);
}
