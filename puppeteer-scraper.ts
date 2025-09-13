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
      const productosGlobales = new Set<string>(); // Para evitar duplicados globales

      // Debug: Analizar estructura del HTML
      this.analizarEstructuraHTML($);
      
      // Método 1: Buscar secciones con productos agrupados
      this.extraerCategoriasPorSecciones($, categoriasMap, productosGlobales);
      
      // Método 2: Si no se encontraron categorías, buscar por grupos de productos
      if (categoriasMap.size === 0) {
        this.extraerCategoriasPorGrupos($, categoriasMap, productosGlobales);
      }
      
      // Método 3: Si aún no hay categorías, crear una categoría general
      if (categoriasMap.size === 0) {
        this.extraerCategoriaGeneral($, categoriasMap, productosGlobales);
      }

      // Convertir Map a Array y limpiar categorías vacías
      let categories = Array.from(categoriasMap.values()).filter(cat => cat.products.length > 0);
      
      // Limpiar y optimizar los datos
      categories = this.limpiarYCategorizar(categories);

      console.log(`📦 Se encontraron ${categories.length} categorías`);
      console.log(`🔍 Total de productos únicos: ${productosGlobales.size}`);

      return {
        categories,
        scrapingDate: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error durante el procesamiento:', error);
      throw error;
    }
  }

  private extraerTituloReal($section: cheerio.Cheerio<any>): string | null {
    // Buscar títulos h2 con las clases específicas que mencionaste
    // Priorizar la clase exacta: font-heading-now-bold italic uppercase
    let titulo = $section.find('h2.font-heading-now-bold.italic.uppercase').first().text().trim() ||
                 $section.find('h2.font-heading-now-bold').first().text().trim() ||
                 $section.find('h2[class*="font-heading-now-bold"]').first().text().trim() ||
                 $section.find('h2[class*="font-heading"]').first().text().trim() ||
                 $section.find('h2').first().text().trim() ||
                 $section.find('h1').first().text().trim() ||
                 $section.find('h3').first().text().trim();
    
    // Si no encuentra en la sección, buscar en elementos padre
    if (!titulo) {
      titulo = $section.parent().find('h2.font-heading-now-bold.italic.uppercase').first().text().trim() ||
               $section.parent().find('h2.font-heading-now-bold').first().text().trim() ||
               $section.parent().find('h2[class*="font-heading-now-bold"]').first().text().trim() ||
               $section.parent().find('h2[class*="font-heading"]').first().text().trim() ||
               $section.parent().find('h2').first().text().trim() ||
               $section.parent().find('h1').first().text().trim() ||
               $section.parent().find('h3').first().text().trim();
    }
    
    // Si aún no encuentra, buscar en elementos hermanos
    if (!titulo) {
      titulo = $section.siblings().find('h2.font-heading-now-bold.italic.uppercase').first().text().trim() ||
               $section.siblings().find('h2.font-heading-now-bold').first().text().trim() ||
               $section.siblings().find('h2[class*="font-heading-now-bold"]').first().text().trim() ||
               $section.siblings().find('h2[class*="font-heading"]').first().text().trim() ||
               $section.siblings().find('h2').first().text().trim();
    }
    
    // Si aún no encuentra, buscar en elementos anteriores (prev)
    if (!titulo) {
      titulo = $section.prev().find('h2.font-heading-now-bold.italic.uppercase').first().text().trim() ||
               $section.prev().find('h2.font-heading-now-bold').first().text().trim() ||
               $section.prev().find('h2[class*="font-heading-now-bold"]').first().text().trim() ||
               $section.prev().find('h2[class*="font-heading"]').first().text().trim() ||
               $section.prev().find('h2').first().text().trim();
    }
    
    // Limpiar el título
    if (titulo) {
      titulo = titulo.replace(/\s+/g, ' ').trim();
    }
    
    return titulo || null;
  }

  private extraerNombreCategoria($section: cheerio.Cheerio<any>): string | null {
    // Buscar el título de la categoría en diferentes selectores
    let titulo = $section.find('h2').first().text().trim() ||
                 $section.find('h1').first().text().trim() ||
                 $section.find('h3').first().text().trim() ||
                 $section.find('[class*="title"]').first().text().trim() ||
                 $section.find('[class*="heading"]').first().text().trim() ||
                 $section.find('[class*="header"]').first().text().trim();
    
    // Si no encuentra título, buscar en elementos padre
    if (!titulo) {
      titulo = $section.parent().find('h2').first().text().trim() ||
               $section.parent().find('h1').first().text().trim() ||
               $section.parent().find('h3').first().text().trim();
    }
    
    // Si no encuentra título, usar el ID de la sección como nombre
    if (!titulo) {
      const sectionId = $section.attr('id');
      if (sectionId) {
        // Convertir el ID a un nombre más legible
        titulo = this.formatearNombreCategoria(sectionId);
      }
    }
    
    // Si no encuentra título, usar clases CSS como nombre
    if (!titulo) {
      const classes = $section.attr('class') || '';
      const classMatch = classes.match(/(?:section|category|grid)-([a-zA-Z0-9-]+)/);
      if (classMatch && classMatch[1]) {
        titulo = this.formatearNombreCategoria(classMatch[1]);
      }
    }
    
    // Validar que el título sea válido
    if (!titulo || titulo.length < 2) return null;
    
    // Filtrar títulos genéricos o inválidos
    const titulosInvalidos = ['', 'Section', 'Category', 'Categoría', 'N/A', 'TBD', 'Default', 'Grid', 'Container', 'Wrapper'];
    if (titulosInvalidos.includes(titulo)) return null;
    
    return titulo;
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

  private extraerProductos($section: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, productosGlobales: Set<string>): Producto[] {
    const productos: Producto[] = [];

    // Buscar todos los elementos de productos
    $section.find('[data-testid="grid-catalog-item"]').each((_, item) => {
      const $item = $(item);
      const producto = this.extraerDatosProducto($item, $);
      
      if (producto) {
        // Crear un identificador único para el producto
        const productoId = `${producto.name}-${producto.url}`;
        
        // Solo agregar si no existe globalmente
        if (!productosGlobales.has(productoId)) {
          productosGlobales.add(productoId);
          productos.push(producto);
        } else {
          console.log(`⚠️ Producto duplicado encontrado: ${producto.name}`);
        }
      }
    });

    return productos;
  }

  private extraerDatosProducto($item: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): Producto | null {
    try {
      // Extraer nombre
      const nombre = $item.find('[data-testid="item-title"]').text().trim();
      if (!nombre || nombre.length < 2) {
        console.log('⚠️ Producto sin nombre válido, omitiendo...');
        return null;
      }

      // Extraer tipo/descripción
      const tipo = $item.find('[data-testid="item-type"]').text().trim();

      // Extraer precio en VBucks
      const precioElement = $item.find('[data-testid="current-vbuck-price"]');
      const vbucks = this.extraerNumero(precioElement.text().trim());
      
      // Validar que el precio sea válido
      if (vbucks <= 0) {
        console.log(`⚠️ Producto "${nombre}" sin precio válido (${vbucks}), omitiendo...`);
        return null;
      }

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
      
      // Validar que la URL sea válida
      if (!url || url === this.baseUrl) {
        console.log(`⚠️ Producto "${nombre}" sin URL válida, omitiendo...`);
        return null;
      }

      // Vencimiento (no está disponible en el HTML proporcionado, pero se puede implementar)
      const vencimiento = null; // Se podría extraer de metadatos adicionales

      const producto = {
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

      // Validación final del producto
      if (this.validarProducto(producto)) {
        return producto;
      } else {
        console.log(`⚠️ Producto "${nombre}" no pasó la validación final, omitiendo...`);
        return null;
      }

    } catch (error) {
      console.warn('⚠️ Error extrayendo datos de producto:', error);
      return null;
    }
  }

  private extraerNumero(texto: string): number {
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private validarProducto(producto: Producto): boolean {
    // Validaciones básicas
    if (!producto.name || producto.name.length < 2) return false;
    if (producto.vbucks <= 0) return false;
    if (!producto.url || producto.url.length < 10) return false;
    
    // Validar que el precio original sea mayor que el precio actual si existe
    if (producto.originalPrice && producto.originalPrice <= producto.vbucks) return false;
    
    // Validar que el nombre no sea genérico o vacío
    const nombresInvalidos = ['', 'Producto', 'Item', 'Elemento', 'N/A', 'TBD'];
    if (nombresInvalidos.includes(producto.name)) return false;
    
    // Validar que la URL sea de Fortnite
    if (!producto.url.includes('fortnite.com')) return false;
    
    return true;
  }

  private analizarEstructuraHTML($: cheerio.CheerioAPI): void {
    console.log('🔍 Analizando estructura del HTML...');
    
    // Buscar todos los elementos que contienen productos
    const elementosConProductos = $('[data-testid="grid-catalog-item"]').parent().parent();
    console.log(`📦 Elementos contenedores de productos encontrados: ${elementosConProductos.length}`);
    
    // Analizar la jerarquía de elementos
    elementosConProductos.each((index, elemento) => {
      const $elemento = $(elemento);
      const tagName = elemento.tagName;
      const id = $elemento.attr('id');
      const classes = $elemento.attr('class');
      const productosEnElemento = $elemento.find('[data-testid="grid-catalog-item"]').length;
      
      console.log(`  ${index + 1}. <${tagName}> id="${id}" class="${classes}" - ${productosEnElemento} productos`);
      
      // Buscar títulos en elementos padre
      const titulo = $elemento.find('h1, h2, h3, h4').first().text().trim();
      if (titulo) {
        console.log(`     Título: "${titulo}"`);
      }
    });
    
    // Buscar secciones con IDs específicos
    const seccionesConId = $('section[id], div[id]');
    console.log(`🏷️ Secciones con ID encontradas: ${seccionesConId.length}`);
    
    seccionesConId.each((index, seccion) => {
      const $seccion = $(seccion);
      const id = $seccion.attr('id');
      const productosEnSeccion = $seccion.find('[data-testid="grid-catalog-item"]').length;
      
      if (productosEnSeccion > 0) {
        console.log(`  ${index + 1}. ID: "${id}" - ${productosEnSeccion} productos`);
      }
    });
  }

  private extraerCategoriasPorSecciones($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>): void {
    // Buscar directamente las secciones con IDs que contienen productos
    $('section[id], div[id]').each((_, section) => {
      const $section = $(section);
      const sectionId = $section.attr('id');
      
      if (sectionId && sectionId !== 'item-shop') { // Excluir el contenedor principal
        const productos = this.extraerProductos($section, $, productosGlobales);
        
        if (productos.length > 0) {
          // Buscar el título real en la sección
          let categoriaNombre = this.extraerTituloReal($section);
          
          // Si no encuentra título real, usar el ID como fallback (sin formatear)
          if (!categoriaNombre) {
            categoriaNombre = sectionId;
            console.log(`⚠️ No se encontró título para la sección ${sectionId}, usando ID como nombre`);
          }
          
          console.log(`🏷️ Categoría encontrada: "${categoriaNombre}" (${sectionId}) - ${productos.length} productos`);
          this.agregarProductosACategoria(categoriasMap, categoriaNombre, productos);
        }
      }
    });
  }

  private extraerCategoriasPorGrupos($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>): void {
    // Buscar contenedores que puedan agrupar productos por categoría
    const contenedores = $('div[class*="container"], div[class*="wrapper"], div[class*="content"]');
    
    contenedores.each((_, contenedor) => {
      const $contenedor = $(contenedor);
      const productos = this.extraerProductos($contenedor, $, productosGlobales);
      
      if (productos.length > 0) {
        // Intentar determinar la categoría basándose en el contexto
        const categoriaNombre = this.determinarCategoriaPorContexto($contenedor, productos);
        this.agregarProductosACategoria(categoriasMap, categoriaNombre, productos);
      }
    });
  }

  private extraerCategoriaGeneral($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>): void {
    // Extraer todos los productos y agruparlos por tipo
    const todosLosProductos = this.extraerProductos($('body'), $, productosGlobales);
    
    if (todosLosProductos.length > 0) {
      // Agrupar por tipo de producto
      const productosPorTipo = new Map<string, Producto[]>();
      
      todosLosProductos.forEach(producto => {
        const tipo = producto.type || 'General';
        if (!productosPorTipo.has(tipo)) {
          productosPorTipo.set(tipo, []);
        }
        productosPorTipo.get(tipo)!.push(producto);
      });
      
      // Crear categorías basadas en tipos
      productosPorTipo.forEach((productos, tipo) => {
        this.agregarProductosACategoria(categoriasMap, tipo, productos);
      });
    }
  }

  private determinarCategoriaPorContexto($contenedor: cheerio.Cheerio<any>, productos: Producto[]): string {
    // Buscar pistas en el contexto para determinar la categoría
    let categoriaNombre = $contenedor.find('h1, h2, h3').first().text().trim();
    
    if (!categoriaNombre) {
      // Analizar los productos para determinar la categoría
      const tipos = productos.map(p => p.type).filter(t => t);
      if (tipos.length > 0 && tipos[0]) {
        categoriaNombre = tipos[0]; // Usar el tipo más común
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
      // Limpiar productos duplicados dentro de la categoría
      const productosUnicos = categoria.products.filter((producto, index, self) => 
        index === self.findIndex(p => p.name === producto.name && p.url === producto.url)
      );

      // Solo agregar categorías con productos válidos
      if (productosUnicos.length > 0 && categoria.name && !nombresCategorias.has(categoria.name)) {
        nombresCategorias.add(categoria.name);
        categoriasLimpias.push({
          name: categoria.name,
          products: productosUnicos
        });
      }
    });

    // Ordenar categorías por número de productos (descendente)
    return categoriasLimpias.sort((a, b) => b.products.length - a.products.length);
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
