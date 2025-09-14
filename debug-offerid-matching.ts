import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

class DebugOfferIdMatching {
  private browser: Browser | null = null;
  private baseUrl = 'https://www.fortnite.com';

  async debugMatching(url: string): Promise<void> {
    try {
      console.log('🔍 Iniciando debug del matching de offerId...');
      
      // Inicializar Puppeteer
      this.browser = await puppeteer.launch({
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
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await this.browser.newPage();
      
      // Configurar user agent y headers
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Configurar viewport
      await page.setViewport({ width: 1920, height: 1080 });

      console.log('🌐 Navegando a la página...');
      
      // Navegar a la página
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Esperar a que se cargue el contenido
      console.log('⏳ Esperando a que se cargue el contenido...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extraer window.__remixContext para obtener offerIds
      console.log('🔍 Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (window as any).__remixContext;
      });

      let productosConOfferId: any[] = [];
      
      if (remixContext) {
        console.log('✅ window.__remixContext encontrado');
        productosConOfferId = this.extraerProductosConOfferId(remixContext);
        console.log(`📦 Productos con offerId encontrados: ${productosConOfferId.length}`);
      } else {
        console.log('⚠️ No se encontró window.__remixContext');
      }

      // Obtener el HTML para extraer productos
      const html = await page.content();
      console.log('✅ HTML obtenido correctamente');

      // Cerrar el navegador
      await this.browser.close();
      this.browser = null;

      // Procesar el HTML con Cheerio para extraer productos
      this.debugHTMLvsRemixContext(html, productosConOfferId);

    } catch (error) {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.error('❌ Error durante el debug:', error);
      throw error;
    }
  }

  private extraerProductosConOfferId(remixContext: any): any[] {
    try {
      const productos: any[] = [];
      this.buscarProductosRecursivamente(remixContext, productos);
      return productos;
    } catch (error) {
      console.error('❌ Error extrayendo productos con offerId:', error);
      return [];
    }
  }

  private buscarProductosRecursivamente(obj: any, productos: any[], profundidad: number = 0): void {
    if (profundidad > 10) return;
    if (typeof obj !== 'object' || obj === null) return;
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.buscarProductosRecursivamente(item, productos, profundidad + 1);
      }
    } else {
      if (obj.offerId && obj.title) {
        productos.push(obj);
      }
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.buscarProductosRecursivamente(obj[key], productos, profundidad + 1);
        }
      }
    }
  }

  private debugHTMLvsRemixContext(html: string, productosConOfferId: any[]): void {
    console.log('\n🔍 DEBUG: Comparando HTML vs RemixContext');
    console.log('==========================================');

    const $ = cheerio.load(html);
    const productosHTML: any[] = [];

    // Extraer productos del HTML
    $('[data-testid="grid-catalog-item"]').each((_, item) => {
      const $item = $(item);
      const nombre = $item.find('[data-testid="item-title"]').text().trim();
      const precioElement = $item.find('[data-testid="current-vbuck-price"]');
      const vbucks = this.extraerNumero(precioElement.text().trim());
      
      if (nombre && vbucks > 0) {
        productosHTML.push({
          nombre,
          vbucks,
          tipo: $item.find('[data-testid="item-type"]').text().trim()
        });
      }
    });

    console.log(`📦 Productos del HTML: ${productosHTML.length}`);
    console.log(`📦 Productos del RemixContext: ${productosConOfferId.length}`);

    // Mostrar algunos ejemplos de productos del HTML
    console.log('\n📋 Primeros 10 productos del HTML:');
    productosHTML.slice(0, 10).forEach((producto, index) => {
      console.log(`   ${index + 1}. "${producto.nombre}" - ${producto.vbucks} VBucks (${producto.tipo})`);
    });

    // Mostrar algunos ejemplos de productos del RemixContext
    console.log('\n📋 Primeros 3 productos del RemixContext:');
    productosConOfferId.slice(0, 3).forEach((producto, index) => {
      const precioRemix = producto.pricing?.finalPrice || producto.price;
      console.log(`   ${index + 1}. "${producto.title}" - ${precioRemix} VBucks (${producto.assetType})`);
      console.log(`      Campos disponibles:`, Object.keys(producto));
      console.log(`      offerId: ${producto.offerId}`);
      console.log(`      title: ${producto.title}`);
      console.log(`      englishTitle: ${producto.englishTitle}`);
      console.log(`      price: ${producto.price}`);
      console.log(`      pricing.finalPrice: ${producto.pricing?.finalPrice}`);
      console.log(`      urlName: ${producto.urlName}`);
      console.log(`      assetType: ${producto.assetType}`);
      console.log(`      color1: ${producto.color1}`);
      console.log(`      color2: ${producto.color2}`);
      console.log(`      color3: ${producto.color3}`);
      console.log('      ---');
    });

    // Intentar hacer matching
    console.log('\n🔍 Intentando matching...');
    let matches = 0;
    let noMatches: any[] = [];

    productosHTML.forEach(productoHTML => {
      const match = this.buscarOfferIdPorProducto(productoHTML.nombre, productoHTML.vbucks, productosConOfferId);
      if (match) {
        matches++;
        console.log(`✅ MATCH: "${productoHTML.nombre}" (${productoHTML.vbucks} VBucks) -> ${match.offerId}`);
      } else {
        noMatches.push(productoHTML);
      }
    });

    console.log(`\n📊 Resultados del matching:`);
    console.log(`   Matches encontrados: ${matches}`);
    console.log(`   Sin match: ${noMatches.length}`);

    if (noMatches.length > 0) {
      console.log('\n❌ Productos sin match (primeros 10):');
      noMatches.slice(0, 10).forEach((producto, index) => {
        console.log(`   ${index + 1}. "${producto.nombre}" - ${producto.vbucks} VBucks`);
        
        // Buscar productos similares en RemixContext
        const similares = productosConOfferId.filter(p => 
          p.title && p.title.toLowerCase().includes(producto.nombre.toLowerCase().split(' ')[0])
        );
        
        if (similares.length > 0) {
          console.log(`      Similares encontrados: ${similares.length}`);
          similares.slice(0, 3).forEach(similar => {
            console.log(`        - "${similar.title}" - ${similar.price} VBucks`);
          });
        }
      });
    }
  }

  private buscarOfferIdPorProducto(nombre: string, vbucks: number, productosConOfferId: any[]): any | null {
    // Buscar por nombre exacto Y precio (usando pricing.finalPrice)
    let producto = productosConOfferId.find(p => {
      const precioRemix = p.pricing?.finalPrice || p.price;
      return (p.title === nombre || p.englishTitle === nombre) && precioRemix === vbucks;
    });
    
    if (producto) return producto;
    
    // Buscar por similitud (ignorar mayúsculas y espacios) Y precio
    const nombreNormalizado = nombre.toLowerCase().replace(/\s+/g, '');
    producto = productosConOfferId.find(p => {
      const tituloNormalizado = (p.title || '').toLowerCase().replace(/\s+/g, '');
      const tituloInglesNormalizado = (p.englishTitle || '').toLowerCase().replace(/\s+/g, '');
      const nombreCoincide = tituloNormalizado === nombreNormalizado || tituloInglesNormalizado === nombreNormalizado;
      const precioRemix = p.pricing?.finalPrice || p.price;
      const precioCoincide = precioRemix === vbucks;
      return nombreCoincide && precioCoincide;
    });
    
    return producto || null;
  }

  private extraerNumero(texto: string): number {
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }
}

// Función principal
async function main() {
  const debugTool = new DebugOfferIdMatching();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando debug del matching de offerId...\n');
    
    await debugTool.debugMatching(url);
    
    console.log('\n✅ Debug completado!');
    
  } catch (error) {
    console.error('\n❌ Error en el debug:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { DebugOfferIdMatching };
