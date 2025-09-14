import puppeteer, { Browser, Page } from 'puppeteer';

// Interfaces para tipado
interface ProductoConOfferId {
  name: string;
  englishTitle: string;
  urlName: string;
  offerId: string;
  assetType: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  isNew: boolean;
  images: string[];
  category: string;
}

interface TiendaConOfferIds {
  products: ProductoConOfferId[];
  totalProducts: number;
  scrapingDate: string;
}

class ProductOfferIdScraper {
  private browser: Browser | null = null;
  private baseUrl = 'https://www.fortnite.com';

  async extraerProductosConOfferId(url: string): Promise<TiendaConOfferIds> {
    try {
      console.log('🔍 Iniciando extracción de productos con offerId...');
      
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

      // Intentar esperar por el selector de productos
      try {
        await page.waitForSelector('[data-testid="grid-catalog-item"]', { timeout: 15000 });
        console.log('✅ Selector de productos encontrado');
      } catch (error) {
        console.log('⚠️ Selector de productos no encontrado, continuando...');
      }

      // Extraer window.__remixContext
      console.log('🔍 Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (window as any).__remixContext;
      });

      if (!remixContext) {
        throw new Error('No se encontró window.__remixContext en la página');
      }

      console.log('✅ window.__remixContext encontrado');

      // Cerrar el navegador
      await this.browser.close();
      this.browser = null;

      // Procesar el contexto de Remix para extraer productos con offerId
      const productos = this.extraerProductosConOfferIdDelContexto(remixContext);

      return {
        products: productos,
        totalProducts: productos.length,
        scrapingDate: new Date().toISOString()
      };

    } catch (error) {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.error('❌ Error durante la extracción:', error);
      throw error;
    }
  }

  private extraerProductosConOfferIdDelContexto(remixContext: any): ProductoConOfferId[] {
    try {
      console.log('🔍 Procesando contexto de Remix para extraer productos...');
      
      const productos: ProductoConOfferId[] = [];
      
      // Buscar en la estructura del contexto
      if (remixContext.state && remixContext.state.loaderData) {
        const loaderData = remixContext.state.loaderData;
        
        // Buscar en diferentes rutas posibles
        const rutas = ['item-shop', 'root', 'routes'];
        
        for (const ruta of rutas) {
          if (loaderData[ruta]) {
            const datosRuta = loaderData[ruta];
            
            // Buscar catalog directamente
            if (datosRuta.catalog) {
              const catalog = datosRuta.catalog;
              this.extraerProductosDeCatalog(catalog, productos, ruta);
            }
            
            // Buscar en _index si existe
            if (datosRuta._index && datosRuta._index.catalog) {
              const catalog = datosRuta._index.catalog;
              this.extraerProductosDeCatalog(catalog, productos, `${ruta}._index`);
            }
          }
        }
      }
      
      // Si no se encontraron productos, buscar recursivamente
      if (productos.length === 0) {
        console.log('🔍 Buscando productos recursivamente...');
        this.buscarProductosRecursivamente(remixContext, productos);
      }
      
      console.log(`✅ Se encontraron ${productos.length} productos con offerId`);
      return productos;
      
    } catch (error) {
      console.error('❌ Error extrayendo productos del contexto:', error);
      return [];
    }
  }

  private extraerProductosDeCatalog(catalog: any, productos: ProductoConOfferId[], ruta: string): void {
    try {
      // Buscar en sections
      if (catalog.sections && Array.isArray(catalog.sections)) {
        console.log(`🔍 Procesando ${catalog.sections.length} secciones en ${ruta}...`);
        
        catalog.sections.forEach((section: any, sectionIndex: number) => {
          if (section.items && Array.isArray(section.items)) {
            console.log(`  📦 Sección ${sectionIndex + 1}: ${section.items.length} items`);
            
            section.items.forEach((item: any) => {
              if (item.offerId) {
                const producto = this.crearProductoDesdeItem(item, section.name || `Sección ${sectionIndex + 1}`);
                if (producto) {
                  productos.push(producto);
                }
              }
            });
          }
        });
      }
      
      // Buscar en items directamente
      if (catalog.items && Array.isArray(catalog.items)) {
        console.log(`🔍 Procesando ${catalog.items.length} items directos en ${ruta}...`);
        
        catalog.items.forEach((item: any) => {
          if (item.offerId) {
            const producto = this.crearProductoDesdeItem(item, 'General');
            if (producto) {
              productos.push(producto);
            }
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error procesando catalog:', error);
    }
  }

  private crearProductoDesdeItem(item: any, categoria: string): ProductoConOfferId | null {
    try {
      if (!item.offerId || !item.title) {
        return null;
      }

      // Extraer precio
      let precio = 0;
      let precioOriginal: number | undefined;
      let descuento: string | undefined;
      let esNuevo = false;

      if (item.price) {
        precio = item.price;
      }

      if (item.originalPrice) {
        precioOriginal = item.originalPrice;
      }

      if (item.discount) {
        descuento = item.discount;
        esNuevo = descuento.includes('¡Nuevo!') || descuento.includes('Nuevo');
      }

      // Extraer imágenes
      const imagenes: string[] = [];
      if (item.image && Array.isArray(item.image)) {
        item.image.forEach((imgGroup: any) => {
          if (imgGroup.lg) imagenes.push(imgGroup.lg);
          else if (imgGroup.md) imagenes.push(imgGroup.md);
          else if (imgGroup.sm) imagenes.push(imgGroup.sm);
        });
      }

      return {
        name: item.title,
        englishTitle: item.englishTitle || item.title,
        urlName: item.urlName || '',
        offerId: item.offerId,
        assetType: item.assetType || 'unknown',
        price: precio,
        originalPrice: precioOriginal,
        discount: descuento,
        isNew: esNuevo,
        images: imagenes,
        category: categoria
      };

    } catch (error) {
      console.error('❌ Error creando producto desde item:', error);
      return null;
    }
  }

  private buscarProductosRecursivamente(obj: any, productos: ProductoConOfferId[], profundidad: number = 0): void {
    if (profundidad > 10) return;
    
    if (typeof obj !== 'object' || obj === null) return;
    
    // Si es un array, buscar en cada elemento
    if (Array.isArray(obj)) {
      for (const item of obj) {
        this.buscarProductosRecursivamente(item, productos, profundidad + 1);
      }
    } else {
      // Si tiene offerId y title, es un producto
      if (obj.offerId && obj.title) {
        const producto = this.crearProductoDesdeItem(obj, 'Encontrado recursivamente');
        if (producto) {
          productos.push(producto);
        }
      }
      
      // Buscar en las propiedades del objeto
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.buscarProductosRecursivamente(obj[key], productos, profundidad + 1);
        }
      }
    }
  }

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: TiendaConOfferIds, archivo: string = 'productos_con_offerid.json'): Promise<void> {
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
  mostrarResumen(datos: TiendaConOfferIds): void {
    console.log('\n📊 RESUMEN DE PRODUCTOS CON OFFERID');
    console.log('=====================================');
    console.log(`📅 Fecha de scraping: ${new Date(datos.scrapingDate).toLocaleString('es-ES')}`);
    console.log(`📦 Total de productos: ${datos.totalProducts}`);
    
    // Agrupar por categoría
    const productosPorCategoria = new Map<string, ProductoConOfferId[]>();
    datos.products.forEach(producto => {
      if (!productosPorCategoria.has(producto.category)) {
        productosPorCategoria.set(producto.category, []);
      }
      productosPorCategoria.get(producto.category)!.push(producto);
    });
    
    console.log(`🏷️ Total de categorías: ${productosPorCategoria.size}`);
    
    // Mostrar productos por categoría
    productosPorCategoria.forEach((productos, categoria) => {
      console.log(`\n🏷️ ${categoria}: ${productos.length} productos`);
      
      productos.slice(0, 5).forEach((producto, index) => {
        console.log(`   ${index + 1}. ${producto.name}`);
        console.log(`      🆔 OfferId: ${producto.offerId}`);
        console.log(`      💰 Precio: ${producto.price} VBucks`);
        if (producto.originalPrice) console.log(`      📉 Precio original: ${producto.originalPrice} VBucks`);
        if (producto.discount) console.log(`      💰 Descuento: ${producto.discount}`);
        if (producto.isNew) console.log(`      🆕 ¡NUEVO!`);
        console.log(`      🏷️ Tipo: ${producto.assetType}`);
        if (producto.images.length > 0) console.log(`      🖼️ ${producto.images.length} imagen(es)`);
      });
      
      if (productos.length > 5) {
        console.log(`   ... y ${productos.length - 5} productos más`);
      }
    });
    
    // Mostrar estadísticas
    const productosConDescuento = datos.products.filter(p => p.discount).length;
    const productosNuevos = datos.products.filter(p => p.isNew).length;
    
    console.log('\n📈 ESTADÍSTICAS:');
    console.log(`   Total productos: ${datos.totalProducts}`);
    console.log(`   Productos nuevos: ${productosNuevos}`);
    console.log(`   Productos con descuento: ${productosConDescuento}`);
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
  const scraper = new ProductOfferIdScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando extracción de productos con offerId...\n');
    
    const datos = await scraper.extraerProductosConOfferId(url);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Extracción completada exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en la extracción:', error);
    await scraper.cerrar();
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { ProductOfferIdScraper, type ProductoConOfferId, type TiendaConOfferIds };
