#!/usr/bin/env bun

/**
 * Script específico para probar si el scraper devuelve categorías con "Invencible"
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { FORTNITE_COOKIES } from './cookies-config';

async function testInvencible() {
  console.log('🔍 Probando búsqueda de categorías con "Invencible"...\n');
  
  let browser = null;
  
  try {
    // Configurar navegador
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ],
      timeout: 120000
    });

    const page = await browser.newPage();
    
    // Configurar user agent y headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Configurar cookies
    console.log('🍪 Configurando cookies...');
    await page.setCookie(...FORTNITE_COOKIES);
    
    // Navegar a la página
    const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
    console.log(`🌐 Navegando a: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 120000 
    });
    
    console.log('✅ Página cargada correctamente');
    
    // Esperar un poco para que se cargue el contenido
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Obtener el HTML
    const html = await page.content();
    console.log('📄 HTML obtenido, procesando...');
    
    // Procesar con Cheerio
    const $ = cheerio.load(html);
    
    // Buscar todas las categorías posibles
    console.log('\n🔍 Buscando categorías...');
    
    const categoriasEncontradas: string[] = [];
    
    // Buscar en diferentes selectores
    const selectoresCategorias = [
      'h1', 'h2', 'h3', 'h4',
      '[class*="title"]',
      '[class*="heading"]',
      '[class*="category"]',
      '[class*="section"]',
      '[data-testid*="title"]',
      '[data-testid*="heading"]',
      '[data-testid*="category"]',
      '[data-testid*="section"]'
    ];
    
    selectoresCategorias.forEach(selector => {
      $(selector).each((_, element) => {
        const texto = $(element).text().trim();
        if (texto && texto.length > 2 && texto.length < 100) {
          categoriasEncontradas.push(texto);
        }
      });
    });
    
    // Buscar específicamente "Invencible"
    console.log('\n🎯 Buscando específicamente "Invencible"...');
    
    const invencibleEncontrado = categoriasEncontradas.filter(cat => 
      cat.toLowerCase().includes('invencible') || 
      cat.toLowerCase().includes('invincible')
    );
    
    // Mostrar resultados
    console.log('\n📊 RESULTADOS:');
    console.log('==============');
    console.log(`Total de elementos de texto encontrados: ${categoriasEncontradas.length}`);
    console.log(`Categorías con "Invencible": ${invencibleEncontrado.length}`);
    
    if (invencibleEncontrado.length > 0) {
      console.log('\n✅ ¡ENCONTRADO! Categorías con "Invencible":');
      invencibleEncontrado.forEach((cat, index) => {
        console.log(`   ${index + 1}. "${cat}"`);
      });
    } else {
      console.log('\n❌ No se encontraron categorías con "Invencible"');
    }
    
    // Mostrar todas las categorías encontradas para referencia
    console.log('\n📋 Todas las categorías encontradas:');
    const categoriasUnicas = [...new Set(categoriasEncontradas)];
    categoriasUnicas.slice(0, 20).forEach((cat, index) => {
      console.log(`   ${index + 1}. "${cat}"`);
    });
    
    if (categoriasUnicas.length > 20) {
      console.log(`   ... y ${categoriasUnicas.length - 20} más`);
    }
    
    // Buscar también en el contexto de Remix
    console.log('\n🔍 Buscando en window.__remixContext...');
    
    const remixContext = await page.evaluate(() => {
      return (globalThis as any).__remixContext;
    });
    
    if (remixContext) {
      console.log('✅ window.__remixContext encontrado');
      
      // Buscar "Invencible" en el contexto
      const contextoString = JSON.stringify(remixContext);
      const invencibleEnContexto = contextoString.toLowerCase().includes('invencible') || 
                                  contextoString.toLowerCase().includes('invincible');
      
      console.log(`Invencible en contexto: ${invencibleEnContexto ? 'SÍ' : 'NO'}`);
      
      if (invencibleEnContexto) {
        console.log('🎉 ¡"Invencible" encontrado en el contexto de Remix!');
      }
    } else {
      console.log('❌ window.__remixContext no encontrado');
    }
    
    // Buscar productos específicos
    console.log('\n🛍️ Buscando productos...');
    
    const productos = $('[data-testid="grid-catalog-item"]');
    console.log(`Productos encontrados: ${productos.length}`);
    
    if (productos.length > 0) {
      console.log('\n📦 Primeros productos encontrados:');
      productos.slice(0, 5).each((index, producto) => {
        const nombre = $(producto).find('[data-testid="item-title"]').text().trim();
        const tipo = $(producto).find('[data-testid="item-type"]').text().trim();
        const precio = $(producto).find('[data-testid="current-vbuck-price"]').text().trim();
        
        if (nombre) {
          console.log(`   ${index + 1}. ${nombre} - ${tipo} - ${precio}`);
        }
      });
    }
    
    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Ejecutar prueba
if (import.meta.main) {
  testInvencible();
}

export { testInvencible };
