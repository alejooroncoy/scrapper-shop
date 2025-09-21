#!/usr/bin/env bun
// Script para probar la extracción de colores con proxy

import { getRandomProxy, displayProxyInfo } from './proxy-config';

async function testExtraccionColoresConProxy() {
  console.log('🎨 Probando extracción de colores con proxy...\n');
  
  // Mostrar información de los proxies
  displayProxyInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const puppeteer = await import('puppeteer');
    const fs = await import('fs');
    
    // Usar proxy aleatorio
    const proxyConfig = getRandomProxy();
    console.log('🎲 Seleccionando proxy aleatorio para extracción de colores...');
    console.log(`🔐 Proxy: ${proxyConfig.server}`);
    console.log(`👤 Usuario: ${proxyConfig.username}`);
    console.log(`🆔 Sesión: ${proxyConfig.password.split('_session-')[1]?.split('_lifetime')[0] || 'N/A'}\n`);

    const browser = await puppeteer.default.launch({ 
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
        // Proxy args
        `--proxy-server=${proxyConfig.server}`
      ]
    });
    
    try {
      const page = await browser.newPage();
      
      // Configurar proxy con autenticación
      await page.authenticate({
        username: proxyConfig.username,
        password: proxyConfig.password
      });
      console.log('✅ Proxy configurado correctamente');
      
      // Configurar user agent y headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Configurar headers adicionales para parecer más humano
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
        'Cache-Control': 'max-age=0'
      });
      
      // Configurar viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Ocultar detección de automatización
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // Ocultar chrome runtime
        (window as any).chrome = {
          runtime: {},
        };
        
        // Ocultar plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Ocultar languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['es-ES', 'es', 'en'],
        });
      });
      
      // Configurar cookies para evitar verificación de seguridad
      const { FORTNITE_COOKIES } = await import('./cookies-config');
      console.log('🍪 Configurando cookies...');
      await page.setCookie(...FORTNITE_COOKIES);
      
      console.log('🌐 Navegando a la página para extraer colores...');
      await page.goto('https://www.fortnite.com/item-shop', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Esperar a que se cargue el contenido con delay aleatorio
      console.log('⏳ Esperando a que se cargue el contenido...');
      const randomDelay = Math.floor(Math.random() * 3000) + 3000; // 3-6 segundos
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      // Simular comportamiento humano - mover mouse
      await page.mouse.move(100, 100);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.mouse.move(200, 200);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔍 Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (window as any).__remixContext;
      });
      
      if (!remixContext) {
        throw new Error('No se encontró window.__remixContext');
      }
      
      console.log('✅ window.__remixContext encontrado');
      
      const productosConColores: any[] = [];
      
      const buscarProductosRecursivamente = (obj: any, path: string = '') => {
        if (typeof obj !== 'object' || obj === null) return;
        
        if (obj.offerId && obj.title) {
          productosConColores.push({
            offerId: obj.offerId,
            title: obj.title,
            englishTitle: obj.englishTitle,
            urlName: obj.urlName,
            assetType: obj.assetType,
            color1: obj.color1,
            color2: obj.color2,
            color3: obj.color3,
            pricing: obj.pricing
          });
        }
        
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            buscarProductosRecursivamente(item, `${path}[${index}]`);
          });
        } else {
          Object.keys(obj).forEach(key => {
            buscarProductosRecursivamente(obj[key], path ? `${path}.${key}` : key);
          });
        }
      };
      
      buscarProductosRecursivamente(remixContext);
      
      console.log(`📦 Productos con colores encontrados: ${productosConColores.length}`);
      
      // Mostrar algunos ejemplos
      if (productosConColores.length > 0) {
        console.log('\n🎨 Ejemplos de productos con colores:');
        productosConColores.slice(0, 5).forEach((producto, index) => {
          console.log(`   ${index + 1}. ${producto.title}`);
          console.log(`      🆔 OfferId: ${producto.offerId}`);
          if (producto.color1) console.log(`      🎨 Color 1: ${producto.color1}`);
          if (producto.color2) console.log(`      🎨 Color 2: ${producto.color2}`);
          if (producto.color3) console.log(`      🎨 Color 3: ${producto.color3}`);
          console.log('');
        });
      }
      
      console.log('✅ Extracción de colores completada exitosamente!');
      
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('❌ Error en extracción de colores:', error);
  }
}

// Función principal
async function main() {
  await testExtraccionColoresConProxy();
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  main().catch(console.error);
}
