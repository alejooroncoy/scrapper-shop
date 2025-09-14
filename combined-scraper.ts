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
  image: string;
  images: ImagenProducto[];
  url: string;
  expiration: string | null;
  offerId?: string; // Nuevo campo para el offerId
}

interface Categoria {
  name: string;
  products: Producto[];
}

interface TiendaFortnite {
  categories: Categoria[];
  offerId: string;
  scrapingDate: string;
}

class CombinedFortniteScraper {
  private browser: Browser | null = null;
  private baseUrl = 'https://www.fortnite.com';

  async scrapeTiendaCompleta(url: string): Promise<TiendaFortnite> {
    try {
      console.log('🔍 Iniciando scraping combinado (productos + offerId)...');
      
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

      // Extraer window.__remixContext para obtener el offerId
      console.log('🔍 Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (window as any).__remixContext;
      });

      let offerId = 'No encontrado';
      if (remixContext) {
        console.log('✅ window.__remixContext encontrado');
        offerId = this.extraerOfferId(remixContext) || 'No encontrado';
        console.log(`🆔 OfferId extraído: ${offerId}`);
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
      const categorias = await this.procesarHTML(html);

      return {
        categories: categorias,
        offerId,
        scrapingDate: new Date().toISOString()
      };

    } catch (error) {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.error('❌ Error durante el scraping:', error);
      throw error;
    }
  }

  private extraerOfferId(remixContext: any): string | null {
    try {
      // Buscar offerId recursivamente en todo el contexto
      return this.buscarOfferIdRecursivo(remixContext);
    } catch (error) {
      console.error('❌ Error extrayendo offerId:', error);
      return null;
    }
  }

  private buscarOfferIdRecursivo(obj: any, profundidad: number = 0): string | null {
    // Limitar la profundidad de búsqueda para evitar bucles infinitos
    if (profundidad > 10) {
      return null;
    }

    if (typeof obj !== 'object' || obj === null) {
      return null;
    }

    // Buscar directamente offerId
    if (obj.offerId && typeof obj.offerId === 'string') {
      return obj.offerId;
    }

    // Buscar en arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const resultado = this.buscarOfferIdRecursivo(item, profundidad + 1);
        if (resultado) {
          return resultado;
        }
      }
    } else {
      // Buscar en propiedades del objeto
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const resultado = this.buscarOfferIdRecursivo(obj[key], profundidad + 1);
          if (resultado) {
            return resultado;
          }
        }
      }
    }

    return null;
  }

  private async procesarHTML(html: string): Promise<Categoria[]> {
    try {
      console.log('🔍 Procesando HTML para extraer productos...');
      
      const $ = cheerio.load(html);
      console.log('✅ HTML cargado correctamente');

      const categoriasMap = new Map<string, Categoria>();
      const productosGlobales = new Set<string>();

      // Buscar secciones con productos agrupados
      this.extraerCategoriasPorSecciones($, categoriasMap, productosGlobales);
      
      // Si no se encontraron categorías, buscar por grupos de productos
      if (categoriasMap.size === 0) {
        this.extraerCategoriasPorGrupos($, categoriasMap, productosGlobales);
      }
      
      // Si aún no hay categorías, crear una categoría general
      if (categoriasMap.size === 0) {
        this.extraerCategoriaGeneral($, categoriasMap, productosGlobales);
      }

      // Convertir Map a Array y limpiar categorías vacías
      let categories = Array.from(categoriasMap.values()).filter(cat => cat.products.length > 0);
      
      // Limpiar y optimizar los datos
      categories = this.limpiarYCategorizar(categories);

      console.log(`📦 Se encontraron ${categories.length} categorías`);
      console.log(`🔍 Total de productos únicos: ${productosGlobales.size}`);

      return categories;

    } catch (error) {
      console.error('❌ Error durante el procesamiento:', error);
      throw error;
    }
  }

  private extraerCategoriasPorSecciones($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>): void {
    // Buscar directamente las secciones con IDs que contienen productos
    $('section[id], div[id]').each((_, section) => {
      const $section = $(section);
      const sectionId = $section.attr('id');
      
      if (sectionId && sectionId !== 'item-shop') {
        const productos = this.extraerProductos($section, $, productosGlobales);
        
        if (productos.length > 0) {
          let categoriaNombre = this.extraerTituloReal($section);
          
          if (!categoriaNombre) {
            categoriaNombre = sectionId;
          }
          
          console.log(`🏷️ Categoría encontrada: "${categoriaNombre}" (${sectionId}) - ${productos.length} productos`);
          this.agregarProductosACategoria(categoriasMap, categoriaNombre, productos);
        }
      }
    });
  }

  private extraerCategoriasPorGrupos($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>): void {
    const contenedores = $('div[class*="container"], div[class*="wrapper"], div[class*="content"]');
    
    contenedores.each((_, contenedor) => {
      const $contenedor = $(contenedor);
      const productos = this.extraerProductos($contenedor, $, productosGlobales);
      
      if (productos.length > 0) {
        const categoriaNombre = this.determinarCategoriaPorContexto($contenedor, productos);
        this.agregarProductosACategoria(categoriasMap, categoriaNombre, productos);
      }
    });
  }

  private extraerCategoriaGeneral($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>): void {
    const todosLosProductos = this.extraerProductos($('body'), $, productosGlobales);
    
    if (todosLosProductos.length > 0) {
      const productosPorTipo = new Map<string, Producto[]>();
      
      todosLosProductos.forEach(producto => {
        const tipo = producto.type || 'General';
        if (!productosPorTipo.has(tipo)) {
          productosPorTipo.set(tipo, []);
        }
        productosPorTipo.get(tipo)!.push(producto);
      });
      
      productosPorTipo.forEach((productos, tipo) => {
        this.agregarProductosACategoria(categoriasMap, tipo, productos);
      });
    }
  }

  private extraerTituloReal($section: cheerio.Cheerio<any>): string | null {
    let titulo = $section.find('h2.font-heading-now-bold.italic.uppercase').first().text().trim() ||
                 $section.find('h2.font-heading-now-bold').first().text().trim() ||
                 $section.find('h2[class*="font-heading-now-bold"]').first().text().trim() ||
                 $section.find('h2[class*="font-heading"]').first().text().trim() ||
                 $section.find('h2').first().text().trim() ||
                 $section.find('h1').first().text().trim() ||
                 $section.find('h3').first().text().trim();
    
    if (!titulo) {
      titulo = $section.parent().find('h2.font-heading-now-bold.italic.uppercase').first().text().trim() ||
               $section.parent().find('h2.font-heading-now-bold').first().text().trim() ||
               $section.parent().find('h2[class*="font-heading-now-bold"]').first().text().trim() ||
               $section.parent().find('h2[class*="font-heading"]').first().text().trim() ||
               $section.parent().find('h2').first().text().trim() ||
               $section.parent().find('h1').first().text().trim() ||
               $section.parent().find('h3').first().text().trim();
    }
    
    if (titulo) {
      titulo = titulo.replace(/\s+/g, ' ').trim();
    }
    
    return titulo || null;
  }

  private extraerProductos($section: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, productosGlobales: Set<string>): Producto[] {
    const productos: Producto[] = [];

    $section.find('[data-testid="grid-catalog-item"]').each((_, item) => {
      const $item = $(item);
      const producto = this.extraerDatosProducto($item, $);
      
      if (producto) {
        const productoId = `${producto.name}-${producto.url}`;
        
        if (!productosGlobales.has(productoId)) {
          productosGlobales.add(productoId);
          productos.push(producto);
        }
      }
    });

    return productos;
  }

  private extraerDatosProducto($item: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): Producto | null {
    try {
      const nombre = $item.find('[data-testid="item-title"]').text().trim();
      if (!nombre || nombre.length < 2) {
        return null;
      }

      const tipo = $item.find('[data-testid="item-type"]').text().trim();
      const precioElement = $item.find('[data-testid="current-vbuck-price"]');
      const vbucks = this.extraerNumero(precioElement.text().trim());
      
      if (vbucks <= 0) {
        return null;
      }

      const precioOriginalElement = $item.find('[data-testid="original-price"]');
      const precioOriginal = precioOriginalElement.length > 0 ? 
        this.extraerNumero(precioOriginalElement.text().trim()) : null;

      const descuentoElement = $item.find('.bg-white, .bg-yellow-100').first();
      const descuento = descuentoElement.length > 0 ? descuentoElement.text().trim() : null;
      const esNuevo = descuento?.includes('¡Nuevo!') || descuento?.includes('Nuevo') || false;

      const imagenes = this.extraerImagenes($item, $);
      const urlElement = $item.find('a').first();
      const urlRelativa = urlElement.attr('href') || '';
      const url = urlRelativa.startsWith('http') ? urlRelativa : `${this.baseUrl}${urlRelativa}`;
      
      if (!url || url === this.baseUrl) {
        return null;
      }

      return {
        name: nombre,
        description: tipo,
        type: tipo,
        vbucks,
        originalPrice: precioOriginal,
        discount: descuento && !esNuevo ? descuento : null,
        isNew: esNuevo,
        image: imagenes.length > 0 ? imagenes[0]?.url || '' : '',
        images: imagenes,
        url,
        expiration: null
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
    
    $item.find('img').each((_, img) => {
      const $img = $(img);
      const srcset = $img.attr('srcset');
      const src = $img.attr('src');
      
      if (srcset) {
        const entradas = srcset.split(',');
        entradas.forEach(entrada => {
          const partes = entrada.trim().split(' ');
          if (partes.length >= 2) {
            const url = partes[0];
            const resolucion = partes[1] || '';
            const ancho = this.extraerNumero(resolucion);
            
            if (url && !url.startsWith(',')) {
              imagenes.push({
                url: url,
                resolution: resolucion,
                width: ancho
              });
            }
          }
        });
      }
      
      if (!srcset && src && !src.startsWith(',')) {
        imagenes.push({
          url: src,
          resolution: 'original',
          width: 0
        });
      }
    });
    
    const imagenesUnicas = imagenes.filter((imagen, index, self) => 
      index === self.findIndex(i => i.url === imagen.url)
    );
    
    return imagenesUnicas.sort((a, b) => b.width - a.width);
  }

  private determinarCategoriaPorContexto($contenedor: cheerio.Cheerio<any>, productos: Producto[]): string {
    let categoriaNombre = $contenedor.find('h1, h2, h3').first().text().trim();
    
    if (!categoriaNombre) {
      const tipos = productos.map(p => p.type).filter(t => t);
      if (tipos.length > 0 && tipos[0]) {
        categoriaNombre = tipos[0];
      }
    }
    
    return categoriaNombre || 'General';
  }

  private agregarProductosACategoria(categoriasMap: Map<string, Categoria>, categoriaNombre: string, productos: Producto[]): void {
    if (categoriasMap.has(categoriaNombre)) {
      const categoriaExistente = categoriasMap.get(categoriaNombre)!;
      const productosUnicos = productos.filter(p => 
        !categoriaExistente.products.some(existente => 
          existente.name === p.name && existente.url === p.url
        )
      );
      categoriaExistente.products.push(...productosUnicos);
    } else {
      categoriasMap.set(categoriaNombre, {
        name: categoriaNombre,
        products: productos
      });
    }
  }

  private limpiarYCategorizar(categorias: Categoria[]): Categoria[] {
    const categoriasLimpias: Categoria[] = [];
    const nombresCategorias = new Set<string>();

    categorias.forEach(categoria => {
      const productosUnicos = categoria.products.filter((producto, index, self) => 
        index === self.findIndex(p => p.name === producto.name && p.url === producto.url)
      );

      if (productosUnicos.length > 0 && categoria.name && !nombresCategorias.has(categoria.name)) {
        nombresCategorias.add(categoria.name);
        categoriasLimpias.push({
          name: categoria.name,
          products: productosUnicos
        });
      }
    });

    return categoriasLimpias.sort((a, b) => b.products.length - a.products.length);
  }

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: TiendaFortnite, archivo: string = 'fortnite_shop_combined.json'): Promise<void> {
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
    console.log('\n📊 RESUMEN DE LA TIENDA DE FORTNITE (COMBINADO)');
    console.log('===============================================');
    console.log(`📅 Fecha de scraping: ${new Date(datos.scrapingDate).toLocaleString('es-ES')}`);
    console.log(`🆔 OfferId: ${datos.offerId}`);
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
  const scraper = new CombinedFortniteScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando web scraper combinado de Fortnite...\n');
    
    const datos = await scraper.scrapeTiendaCompleta(url);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Scraping combinado completado exitosamente!');
    
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

export { CombinedFortniteScraper, type Producto, type Categoria, type TiendaFortnite, type ImagenProducto };
