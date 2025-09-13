import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

// Interfaces para tipado
interface ImagenProducto {
  url: string;
  resolution: string;
  width: number;
}

interface Producto {
  name: string;
  description: string | null;
  type: string;
  vbucks: number;
  originalPrice: number | null;
  discount: string | null;
  isNew: boolean;
  image: string; // Imagen principal (compatibilidad)
  images: ImagenProducto[]; // Todas las imágenes disponibles
  url: string;
  expiration: string | null;
}

interface Categoria {
  name: string;
  products: Producto[];
}

interface TiendaFortnite {
  categories: Categoria[];
  scrapingDate: string;
}

class FortnitePuppeteerScraper {
  private browser: Browser | null = null;
  private baseUrl = 'https://www.fortnite.com';

  async scrapeTienda(url: string): Promise<TiendaFortnite> {
    try {
      console.log('🔍 Iniciando scraping con Puppeteer...');
      
      // Inicializar Puppeteer
      this.browser = await puppeteer.launch({
        headless: true, // Cambiar a false para ver el navegador
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
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
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Esperar a que se carguen los productos
      console.log('⏳ Esperando a que se carguen los productos...');
      await page.waitForSelector('[data-testid="grid-catalog-item"]', { timeout: 10000 });

      // Obtener el HTML
      const html = await page.content();
      console.log('✅ HTML obtenido correctamente');

      // Cerrar el navegador
      await this.browser.close();
      this.browser = null;

      // Procesar el HTML con Cheerio
      return await this.procesarHTML(html);

    } catch (error) {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.error('❌ Error durante el scraping:', error);
      throw error;
    }
  }

  private async procesarHTML(html: string): Promise<TiendaFortnite> {
    try {
      console.log('🔍 Procesando HTML...');
      
      const $ = cheerio.load(html);
      console.log('✅ HTML cargado correctamente');

      const categoriasMap = new Map<string, Categoria>();

      // Buscar todas las secciones de categorías (mejorado para capturar más categorías)
      $('section[id]').each((_, section) => {
        const $section = $(section);
        const categoriaNombre = this.extraerNombreCategoria($section);
        
        if (categoriaNombre) {
          const productos = this.extraerProductos($section, $);
          if (productos.length > 0) {
            // Si ya existe la categoría, agregar productos a la existente
            if (categoriasMap.has(categoriaNombre)) {
              const categoriaExistente = categoriasMap.get(categoriaNombre)!;
              categoriaExistente.products.push(...productos);
            } else {
              // Crear nueva categoría
              categoriasMap.set(categoriaNombre, {
                name: categoriaNombre,
                products: productos
              });
            }
          }
        }
      });

      // Convertir Map a Array
      const categories = Array.from(categoriasMap.values());

      console.log(`📦 Se encontraron ${categories.length} categorías`);

      return {
        categories,
        scrapingDate: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error durante el procesamiento:', error);
      throw error;
    }
  }

  private extraerNombreCategoria($section: cheerio.Cheerio<any>): string | null {
    // Buscar el título de la categoría en diferentes selectores
    let titulo = $section.find('h2').first().text().trim() ||
                 $section.find('h1').first().text().trim() ||
                 $section.find('[class*="title"]').first().text().trim();
    
    // Si no encuentra título, usar el ID de la sección como nombre
    if (!titulo) {
      const sectionId = $section.attr('id');
      if (sectionId) {
        // Convertir el ID a un nombre más legible
        titulo = this.formatearNombreCategoria(sectionId);
      }
    }
    
    return titulo || null;
  }

  private formatearNombreCategoria(id: string): string {
    // Convertir IDs como "kaicenatbundle-new" a "Kai Cenat Bundle"
    return id
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/bundle/g, 'Bundle')
      .replace(/new/g, '(Nuevo)')
      .replace(/limitedtime/g, 'Tiempo Limitado')
      .replace(/bestsellers/g, 'Más Vendidos')
      .replace(/thebindingofisaac/g, 'The Binding of Isaac')
      .replace(/victoryvibes/g, 'Vibes de Victoria')
      .replace(/ironspiderblackhulk/g, 'Iron Spider Black Hulk')
      .replace(/bbhead/g, 'BB Head')
      .replace(/numbnike/g, 'Numb Nike')
      .replace(/battleready/g, 'Listo para la Batalla')
      .replace(/nosweat/g, 'No Sweat')
      .replace(/finishingthisfight/g, 'Terminando esta Pelea')
      .replace(/bljacoblockerbundle/g, 'BL Jacob Locker Bundle')
      .replace(/adidasnoshoe/g, 'Adidas No Shoe')
      .replace(/takumi/g, 'Takumi')
      .replace(/blockclassicstormroot/g, 'Block Classic Stormroot')
      .replace(/snoop/g, 'Snoop')
      .replace(/juicewrld/g, 'Juice WRLD')
      .replace(/gorillaz/g, 'Gorillaz');
  }

  private extraerProductos($section: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): Producto[] {
    const productos: Producto[] = [];

    // Buscar todos los elementos de productos
    $section.find('[data-testid="grid-catalog-item"]').each((_, item) => {
      const $item = $(item);
      const producto = this.extraerDatosProducto($item, $);
      
      if (producto) {
        productos.push(producto);
      }
    });

    return productos;
  }

  private extraerDatosProducto($item: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): Producto | null {
    try {
      // Extraer nombre
      const nombre = $item.find('[data-testid="item-title"]').text().trim();
      if (!nombre) return null;

      // Extraer tipo/descripción
      const tipo = $item.find('[data-testid="item-type"]').text().trim();

      // Extraer precio en VBucks
      const precioElement = $item.find('[data-testid="current-vbuck-price"]');
      const vbucks = this.extraerNumero(precioElement.text().trim());

      // Extraer precio original (si hay descuento)
      const precioOriginalElement = $item.find('[data-testid="original-price"]');
      const precioOriginal = precioOriginalElement.length > 0 ? 
        this.extraerNumero(precioOriginalElement.text().trim()) : null;

      // Extraer descuento
      const descuentoElement = $item.find('.bg-white, .bg-yellow-100').first();
      const descuento = descuentoElement.length > 0 ? descuentoElement.text().trim() : null;

      // Verificar si es nuevo
      const esNuevo = descuento?.includes('¡Nuevo!') || descuento?.includes('Nuevo') || false;

      // Extraer imágenes (mejorado para capturar múltiples resoluciones)
      const imagenes = this.extraerImagenes($item, $);

      // Extraer URL
      const urlElement = $item.find('a').first();
      const urlRelativa = urlElement.attr('href') || '';
      const url = urlRelativa.startsWith('http') ? urlRelativa : `${this.baseUrl}${urlRelativa}`;

      // Vencimiento (no está disponible en el HTML proporcionado, pero se puede implementar)
      const vencimiento = null; // Se podría extraer de metadatos adicionales

      return {
        name: nombre,
        description: tipo,
        type: tipo,
        vbucks,
        originalPrice: precioOriginal,
        discount: descuento && !esNuevo ? descuento : null,
        isNew: esNuevo,
        image: imagenes.length > 0 ? imagenes[0]?.url || '' : '', // Imagen principal
        images: imagenes,
        url,
        expiration: vencimiento
      };

    } catch (error) {
      console.warn('⚠️ Error extrayendo datos de producto:', error);
      return null;
    }
  }

  private extraerNumero(texto: string): number {
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private extraerImagenes($item: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): ImagenProducto[] {
    const imagenes: ImagenProducto[] = [];
    
    // Buscar todas las imágenes en el elemento
    $item.find('img').each((_, img) => {
      const $img = $(img);
      const srcset = $img.attr('srcset');
      const src = $img.attr('src');
      
      // Procesar srcset si existe
      if (srcset) {
        // Dividir por comas y procesar cada entrada
        const entradas = srcset.split(',');
        entradas.forEach(entrada => {
          const partes = entrada.trim().split(' ');
          if (partes.length >= 2) {
            const url = partes[0];
            const resolucion = partes[1] || '';
            const ancho = this.extraerNumero(resolucion);
            
            if (url && !url.startsWith(',')) { // Evitar URLs vacías
              imagenes.push({
                url: url,
                resolution: resolucion,
                width: ancho
              });
            }
          }
        });
      }
      
      // Si no hay srcset pero hay src, agregar la imagen
      if (!srcset && src && !src.startsWith(',')) {
        imagenes.push({
          url: src,
          resolution: 'original',
          width: 0
        });
      }
    });
    
    // Eliminar duplicados basándose en la URL
    const imagenesUnicas = imagenes.filter((imagen, index, self) => 
      index === self.findIndex(i => i.url === imagen.url)
    );
    
    // Ordenar por ancho (mayor a menor)
    return imagenesUnicas.sort((a, b) => b.width - a.width);
  }

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: TiendaFortnite, archivo: string = 'fortnite_shop_puppeteer.json'): Promise<void> {
    try {
      const jsonString = JSON.stringify(datos, null, 2);
      await Bun.write(archivo, jsonString);
      console.log(`💾 Datos guardados en ${archivo}`);
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      throw error;
    }
  }

  // Método para mostrar un resumen de los datos
  mostrarResumen(datos: TiendaFortnite): void {
    console.log('\n📊 RESUMEN DE LA TIENDA DE FORTNITE');
    console.log('=====================================');
    console.log(`📅 Fecha de scraping: ${new Date(datos.scrapingDate).toLocaleString('es-ES')}`);
    console.log(`📦 Total de categorías: ${datos.categories.length}`);
    
    let totalProductos = 0;
    let totalNuevos = 0;
    let totalConDescuento = 0;

    datos.categories.forEach(categoria => {
      console.log(`\n🏷️  ${categoria.name}: ${categoria.products.length} productos`);
      
      categoria.products.forEach(producto => {
        totalProductos++;
        if (producto.isNew) totalNuevos++;
        if (producto.discount) totalConDescuento++;
        
        console.log(`   • ${producto.name} - ${producto.vbucks} VBucks (${producto.type})`);
        if (producto.isNew) console.log('     🆕 ¡NUEVO!');
        if (producto.discount) console.log(`     💰 ${producto.discount}`);
        if (producto.originalPrice) console.log(`     📉 Precio original: ${producto.originalPrice} VBucks`);
        if (producto.images.length > 0) console.log(`     🖼️ ${producto.images.length} imagen(es) disponible(s)`);
      });
    });

    console.log('\n📈 ESTADÍSTICAS:');
    console.log(`   Total productos: ${totalProductos}`);
    console.log(`   Productos nuevos: ${totalNuevos}`);
    console.log(`   Productos con descuento: ${totalConDescuento}`);
  }

  // Método para cerrar el navegador si es necesario
  async cerrar(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Función principal
async function main() {
  const scraper = new FortnitePuppeteerScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando web scraper de Fortnite con Puppeteer...\n');
    
    const datos = await scraper.scrapeTienda(url);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Scraping completado exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en el scraping:', error);
    await scraper.cerrar();
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { FortnitePuppeteerScraper, type Producto, type Categoria, type TiendaFortnite, type ImagenProducto };
