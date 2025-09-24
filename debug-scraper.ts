#!/usr/bin/env bun

/**
 * Script de diagnóstico para identificar por qué el scraper principal no extrae datos
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { FORTNITE_COOKIES } from './cookies-config';

async function debugScraper() {
  console.log('🔍 Diagnóstico del scraper principal...\n');
  
  let browser = null;
  
  try {
    // Configurar navegador igual que el scraper principal
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
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
    
    // Configurar igual que el scraper principal
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Ocultar detección de automatización
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      (globalThis as any).chrome = {
        runtime: {},
      };
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['es-ES', 'es', 'en'],
      });
    });

    // Configurar cookies
    console.log('🍪 Configurando cookies...');
    await page.setCookie(...FORTNITE_COOKIES);

    const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
    console.log(`🌐 Navegando a: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 120000 
    });
    
    console.log('✅ Página cargada correctamente');
    
    // Simular comportamiento humano
    await page.evaluate(() => {
      (globalThis as any).scrollTo({ top: 100, behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await page.evaluate(() => {
      (globalThis as any).scrollTo({ top: 300, behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.evaluate(() => {
      (globalThis as any).scrollTo({ top: 0, behavior: 'smooth' });
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Esperar por el selector de productos
    console.log('🔍 Buscando selector de productos...');
    try {
      await page.waitForSelector('[data-testid="grid-catalog-item"]', { timeout: 15000 });
      console.log('✅ Selector de productos encontrado');
    } catch (error) {
      console.log('❌ Selector de productos no encontrado');
    }
    
    // Obtener HTML
    const html = await page.content();
    console.log('📄 HTML obtenido, procesando...');
    
    // Procesar con Cheerio
    const $ = cheerio.load(html);
    
    // DIAGNÓSTICO 1: Verificar selectores específicos del scraper principal
    console.log('\n🔍 DIAGNÓSTICO 1: Selectores específicos del scraper principal');
    console.log('=============================================================');
    
    const selectoresProductos = [
      '[data-testid="grid-catalog-item"]',
      '[data-testid="item-title"]',
      '[data-testid="item-type"]',
      '[data-testid="current-vbuck-price"]',
      '[data-testid="original-price"]'
    ];
    
    selectoresProductos.forEach(selector => {
      const elementos = $(selector);
      console.log(`${selector}: ${elementos.length} elementos encontrados`);
      
      if (elementos.length > 0) {
        console.log(`  Primeros 3 elementos:`);
        elementos.slice(0, 3).each((index, element) => {
          const texto = $(element).text().trim();
          console.log(`    ${index + 1}. "${texto}"`);
        });
      }
    });
    
    // DIAGNÓSTICO 2: Verificar secciones
    console.log('\n🔍 DIAGNÓSTICO 2: Secciones y categorías');
    console.log('========================================');
    
    const secciones = $('section[id], div[id]');
    console.log(`Secciones con ID encontradas: ${secciones.length}`);
    
    secciones.slice(0, 10).each((index, section) => {
      const $section = $(section);
      const id = $section.attr('id');
      const titulo = $section.find('h1, h2, h3').first().text().trim();
      console.log(`  ${index + 1}. ID: "${id}" - Título: "${titulo}"`);
    });
    
    // DIAGNÓSTICO 3: Verificar productos con selectores alternativos
    console.log('\n🔍 DIAGNÓSTICO 3: Selectores alternativos para productos');
    console.log('=======================================================');
    
    const selectoresAlternativos = [
      '.grid-catalog-item',
      '[class*="catalog-item"]',
      '[class*="product"]',
      '[class*="item"]',
      'article',
      '.card',
      '[class*="card"]'
    ];
    
    selectoresAlternativos.forEach(selector => {
      const elementos = $(selector);
      console.log(`${selector}: ${elementos.length} elementos encontrados`);
    });
    
    // DIAGNÓSTICO 4: Verificar si hay productos con "Invencible"
    console.log('\n🔍 DIAGNÓSTICO 4: Búsqueda específica de "Invencible"');
    console.log('==================================================');
    
    const invencibleElements = $('*').filter((_, element) => {
      return $(element).text().toLowerCase().includes('invencible');
    });
    
    console.log(`Elementos con "Invencible": ${invencibleElements.length}`);
    
    if (invencibleElements.length > 0) {
      console.log('Primeros 5 elementos con "Invencible":');
      invencibleElements.slice(0, 5).each((index, element) => {
        const texto = $(element).text().trim();
        const tagName = element.tagName;
        const className = $(element).attr('class') || '';
        console.log(`  ${index + 1}. <${tagName} class="${className}"> "${texto}"`);
      });
    }
    
    // DIAGNÓSTICO 5: Verificar contexto de Remix
    console.log('\n🔍 DIAGNÓSTICO 5: Contexto de Remix');
    console.log('==================================');
    
    const remixContext = await page.evaluate(() => {
      return (globalThis as any).__remixContext;
    });
    
    if (remixContext) {
      console.log('✅ window.__remixContext encontrado');
      
      // Buscar productos en el contexto
      const contextoString = JSON.stringify(remixContext);
      const tieneProductos = contextoString.includes('title') && contextoString.includes('price');
      const tieneInvencible = contextoString.toLowerCase().includes('invencible');
      
      console.log(`Contiene productos: ${tieneProductos ? 'SÍ' : 'NO'}`);
      console.log(`Contiene "Invencible": ${tieneInvencible ? 'SÍ' : 'NO'}`);
      
      if (tieneInvencible) {
        console.log('🎉 ¡"Invencible" encontrado en el contexto de Remix!');
      }
    } else {
      console.log('❌ window.__remixContext no encontrado');
    }
    
    // DIAGNÓSTICO 6: Probar extracción manual de productos
    console.log('\n🔍 DIAGNÓSTICO 6: Extracción manual de productos');
    console.log('==============================================');
    
    const productosManuales: any[] = [];
    
    $('[data-testid="grid-catalog-item"]').each((_, item) => {
      const $item = $(item);
      const nombre = $item.find('[data-testid="item-title"]').text().trim();
      const tipo = $item.find('[data-testid="item-type"]').text().trim();
      const precio = $item.find('[data-testid="current-vbuck-price"]').text().trim();
      
      if (nombre && precio) {
        productosManuales.push({
          nombre,
          tipo,
          precio,
          esInvencible: nombre.toLowerCase().includes('invencible')
        });
      }
    });
    
    console.log(`Productos extraídos manualmente: ${productosManuales.length}`);
    
    if (productosManuales.length > 0) {
      console.log('Primeros 5 productos:');
      productosManuales.slice(0, 5).forEach((producto, index) => {
        console.log(`  ${index + 1}. ${producto.nombre} - ${producto.tipo} - ${producto.precio} ${producto.esInvencible ? '(INVENCIBLE)' : ''}`);
      });
      
      const productosInvencible = productosManuales.filter(p => p.esInvencible);
      console.log(`\nProductos con "Invencible": ${productosInvencible.length}`);
      
      if (productosInvencible.length > 0) {
        console.log('🎉 ¡Productos con "Invencible" encontrados!');
        productosInvencible.forEach((producto, index) => {
          console.log(`  ${index + 1}. ${producto.nombre} - ${producto.precio}`);
        });
      }
    }
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Ejecutar diagnóstico
if (import.meta.main) {
  debugScraper();
}

export { debugScraper };
