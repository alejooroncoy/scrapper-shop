import * as cheerio from 'cheerio';

// Interfaces para tipado
interface Producto {
  nombre: string;
  descripcion: string | null;
  tipo: string;
  vbucks: number;
  precioOriginal: number | null;
  descuento: string | null;
  esNuevo: boolean;
  imagen: string;
  url: string;
  vencimiento: string | null;
}

interface Categoria {
  nombre: string;
  productos: Producto[];
}

interface TiendaFortnite {
  categorias: Categoria[];
  fechaScraping: string;
}

class FortniteScraper {
  private baseUrl = 'https://www.fortnite.com';

  async scrapeTienda(url: string): Promise<TiendaFortnite> {
    try {
      console.log('🔍 Iniciando scraping de la tienda de Fortnite...');
      
      // Hacer la petición HTTP
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      console.log('✅ HTML obtenido correctamente');

      const categorias: Categoria[] = [];

      // Buscar todas las secciones de categorías
      $('section[id*="-new"], section[id*="-bundle"], section[id*="-featured"]').each((_, section) => {
        const $section = $(section);
        const categoriaNombre = this.extraerNombreCategoria($section);
        
        if (categoriaNombre) {
          const productos = this.extraerProductos($section, $);
          if (productos.length > 0) {
            categorias.push({
              nombre: categoriaNombre,
              productos: productos
            });
          }
        }
      });

      console.log(`📦 Se encontraron ${categorias.length} categorías`);

      return {
        categorias,
        fechaScraping: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error durante el scraping:', error);
      throw error;
    }
  }

  private extraerNombreCategoria($section: cheerio.Cheerio<any>): string | null {
    // Buscar el título de la categoría en diferentes selectores
    const titulo = $section.find('h2').first().text().trim() ||
                   $section.find('h1').first().text().trim() ||
                   $section.find('[class*="title"]').first().text().trim();
    
    return titulo || null;
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

      // Extraer imagen
      const imagenElement = $item.find('img').first();
      const imagen = imagenElement.attr('src') || imagenElement.attr('srcset')?.split(',')[0]?.trim() || '';

      // Extraer URL
      const urlElement = $item.find('a').first();
      const urlRelativa = urlElement.attr('href') || '';
      const url = urlRelativa.startsWith('http') ? urlRelativa : `${this.baseUrl}${urlRelativa}`;

      // Vencimiento (no está disponible en el HTML proporcionado, pero se puede implementar)
      const vencimiento = null; // Se podría extraer de metadatos adicionales

      return {
        nombre,
        descripcion: tipo,
        tipo,
        vbucks,
        precioOriginal,
        descuento: descuento && !esNuevo ? descuento : null,
        esNuevo,
        imagen,
        url,
        vencimiento
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

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: TiendaFortnite, archivo: string = 'fortnite_shop.json'): Promise<void> {
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
    console.log(`📅 Fecha de scraping: ${new Date(datos.fechaScraping).toLocaleString('es-ES')}`);
    console.log(`📦 Total de categorías: ${datos.categorias.length}`);
    
    let totalProductos = 0;
    let totalNuevos = 0;
    let totalConDescuento = 0;

    datos.categorias.forEach(categoria => {
      console.log(`\n🏷️  ${categoria.nombre}: ${categoria.productos.length} productos`);
      
      categoria.productos.forEach(producto => {
        totalProductos++;
        if (producto.esNuevo) totalNuevos++;
        if (producto.descuento) totalConDescuento++;
        
        console.log(`   • ${producto.nombre} - ${producto.vbucks} VBucks (${producto.tipo})`);
        if (producto.esNuevo) console.log('     🆕 ¡NUEVO!');
        if (producto.descuento) console.log(`     💰 ${producto.descuento}`);
        if (producto.precioOriginal) console.log(`     📉 Precio original: ${producto.precioOriginal} VBucks`);
      });
    });

    console.log('\n📈 ESTADÍSTICAS:');
    console.log(`   Total productos: ${totalProductos}`);
    console.log(`   Productos nuevos: ${totalNuevos}`);
    console.log(`   Productos con descuento: ${totalConDescuento}`);
  }
}

// Función principal
async function main() {
  const scraper = new FortniteScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando web scraper de Fortnite...\n');
    
    const datos = await scraper.scrapeTienda(url);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Scraping completado exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en el scraping:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { FortniteScraper, type Producto, type Categoria, type TiendaFortnite };