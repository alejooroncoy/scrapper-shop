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

class FortniteExampleScraper {
  private baseUrl = 'https://www.fortnite.com';

  // Método para procesar HTML de ejemplo
  async procesarHTML(html: string): Promise<TiendaFortnite> {
    try {
      console.log('🔍 Procesando HTML de ejemplo...');
      
      const $ = cheerio.load(html);
      console.log('✅ HTML cargado correctamente');

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
      console.error('❌ Error durante el procesamiento:', error);
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
  async guardarDatos(datos: TiendaFortnite, archivo: string = 'fortnite_shop_example.json'): Promise<void> {
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

// HTML de ejemplo que proporcionaste
const htmlEjemplo = `
<section id="kaicenatbundle-new" class="scroll-mt-[4rem] xs:pb-0 pb-12 sm:pb-0 lg:pb-[60px] first:pt-0 md:scroll-mt-2">
  <h2 class="font-heading-now-bold italic uppercase mb-2 text-lg leading-none lg:text-2xl">Kai Cenat</h2>
  <div class="xs:pb-10 flex flex-col gap-1">
    <div class="flex flex-col items-center gap-3">
      <div class="grid w-full grid-flow-dense auto-rows-auto grid-cols-[repeat(2,1fr)] sm:grid-cols-[repeat(3,1fr)] md:grid-cols-[repeat(4,1fr)]">
        <div class="relative min-w-0 p-1.5 row-span-1 col-span-2 sm:col-span-3 md:col-span-4" data-testid="grid-catalog-item">
          <div class="z-1 hover-outline focus-outline group relative flex h-full w-full overflow-hidden rounded-lg bg-black/30 transition-[scale,opacity] focus-within:bg-black/50 hover:bg-black/50 aspect-[1/.76] md:aspect-[1/.516] lg:aspect-[1/.38625] scale-100 opacity-100" data-testid="dynamicbundle-tile">
            <a class="z-1 flex h-full w-full" data-discover="true" href="/item-shop/bundles/kai-cenat-bundle-e2f290bb?lang=es-ES">
              <div class="relative z-10 flex w-full flex-col justify-between">
                <div class="z-10 w-full px-2 pt-2">
                  <div class="translate-x-0 opacity-100 delay-300 flex text-black items-center overflow-hidden whitespace-nowrap rounded-full px-3 py-2 w-max max-w-full leading-tight transition-[translate,opacity] bg-white">
                    <div class="relative flex w-full font-heading-now-bold text-2xs uppercase italic">
                      <div class="relative flex w-full overflow-hidden align-middle">
                        <div class="pe-1">4700 paVos de descuento</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="z-10 flex flex-1 items-end p-4 pb-2 sm:items-start sm:pt-2"></div>
                <div class="relative w-full">
                  <div class="absolute bottom-0 left-0 h-full w-full pt-32" style="background:linear-gradient(0deg, #918a7e 0%, rgba(145, 138, 126, 0) 100%)"></div>
                  <div class="relative z-1 flex w-full flex-col gap-1 self-end p-4 pt-0 sm:pt-1">
                    <div class="font-heading-now-medium md:text-md line-clamp-2 w-full text-sm leading-6 text-wrap text-ellipsis lg:text-lg lg:leading-7" data-testid="item-title">Lote de Kai Cenat</div>
                    <div class="ease font-heading-now-regular lg:text-md max-h-0 transform overflow-hidden text-sm leading-tight transition-[max-height,margin] duration-250 group-hover:mb-1 group-hover:max-h-[100px]" data-testid="item-type">Lote</div>
                    <div class="flex items-center leading-none" data-testid="vbuck-price">
                      <span style="position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);white-space:nowrap;word-wrap:normal">Precio rebajado de los paVos</span>
                      <span class="font-heading-now-medium text-sm md:text-md flex items-center leading-none relative w-max uppercase" data-testid="current-vbuck-price">
                        <svg viewBox="0 0 24 24" class="w-[1em] h-[1em] inline-block text-[1.5rem] me-1" aria-hidden="true" data-testid="VBucksIcon">
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5ZM10.1051 7.5H6L9.31376 16.5H14.6306L18 7.5H13.8887L12.0896 13.7038L12.0031 14.0427H11.9784L11.9042 13.7038L10.1051 7.5Z"></path>
                        </svg>3500
                      </span>
                      <span style="position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);white-space:nowrap;word-wrap:normal">Precio original de los paVos</span>
                      <s class="font-heading-now-medium text-sm md:text-md flex items-center leading-none relative w-max before:content-[&quot;&quot;] opacity-95 before:left-1/2 before:-translate-x-1/2 decoration-transparent before:absolute before:top-1/2 before:-translate-y-1/2 before:h-[3px] before:w-full before:bg-white before:-rotate-[7deg] before:opacity-80 px-1 opacity-min-contrast ms-3" data-testid="original-price">8200</s>
                    </div>
                  </div>
                </div>
              </div>
              <div class="absolute h-full w-full gradient-mask transition-all group-focus-within:scale-[1.03] group-hover:scale-[1.03]">
                <div class="h-full w-full absolute left-0 top-0 bundle">
                  <div data-testid="image-swiper" class="transition-wipe-tile absolute aspect-auto h-full w-full translate-x-[-50%] translate-y-[-50%] transition-all ease-in-out object-contain bundle scale-[1.4] md:scale-[1.75] lg:scale-[2.28] bundle left-[50%] top-[70%] md:left-[50%] md:top-[78%] lg:left-[50%] lg:top-[100%] bundle">
                    <span data-testid="image-container" aria-busy="false" class="flex justify-center w-full h-full absolute top-0 bundle left-0">
                      <img loading="lazy" class="opacity-100 scale-100 transition-[opacity,scale] duration-100 object-cover" alt="" srcset=", https://ucs-images.fortnite.com/blobs/ba/0e/3f7e-e509-4972-a20e-67a12f5ea0bf?X-Amz-Algorithm=AWS4-HMAC-SHA256&amp;X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&amp;X-Amz-Credential=AKIA2SBBZFECCYQWRK6G%2F20250913%2Fus-east-1%2Fs3%2Faws4_request&amp;X-Amz-Date=20250913T170554Z&amp;X-Amz-Expires=90000&amp;X-Amz-Signature=f1899033f363e636d6faa4e27e15d6c908ef62bea439b2327a40893d3a5896fc&amp;X-Amz-SignedHeaders=host&amp;response-content-disposition=inline%3Bfilename%3D%22file.png%22%3Bfilename%2A%3DUTF-8%27%27input-256x256.png&amp;x-id=GetObject 512w, https://ucs-images.fortnite.com/blobs/b0/d5/382e-f399-4af6-815f-147843d010b7?X-Amz-Algorithm=AWS4-HMAC-SHA256&amp;X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&amp;X-Amz-Credential=AKIA2SBBZFECCYQWRK6G%2F20250913%2Fus-east-1%2Fs3%2Faws4_request&amp;X-Amz-Date=20250913T170554Z&amp;X-Amz-Expires=90000&amp;X-Amz-Signature=a6742d0dfe2bc5a205e25bd990ad5b45c378976cc71e5f9899ed7553a89a948&amp;X-Amz-SignedHeaders=host&amp;response-content-disposition=inline%3Bfilename%3D%22file.png%22%3Bfilename%2A%3DUTF-8%27%27input-512x512.png&amp;x-id=GetObject 768w, https://ucs-images.fortnite.com/blobs/47/21/4aa0-ac1b-4121-b074-3e1eb24b646d?X-Amz-Algorithm=AWS4-HMAC-SHA256&amp;X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&amp;X-Amz-Credential=AKIA2SBBZFECCYQWRK6G%2F20250913%2Fus-east-1%2Fs3%2Faws4_request&amp;X-Amz-Date=20250913T170554Z&amp;X-Amz-Expires=90000&amp;X-Amz-Signature=65e4af563873ba1a3f303971b5974cd5e00de9e7a8a770740fe75098dce304a6&amp;X-Amz-SignedHeaders=host&amp;response-content-disposition=inline%3Bfilename%3D%22file.png%22%3Bfilename%2A%3DUTF-8%27%27input-1024x1024.png&amp;x-id=GetObject 1024w"></span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
        <div class="relative min-w-0 p-1.5 row-span-1 col-span-1" data-testid="grid-catalog-item">
          <div class="z-1 hover-outline focus-outline group relative flex h-full w-full overflow-hidden rounded-lg bg-black/30 transition-[scale,opacity] focus-within:bg-black/50 hover:bg-black/50 aspect-[.627] scale-100 opacity-100" data-testid="dynamicbundle-tile">
            <a class="z-1 flex h-full w-full" data-discover="true" href="/item-shop/bundles/kai-cenat-dd65401c?lang=es-ES">
              <div class="relative z-10 flex w-full flex-col justify-between">
                <div class="z-10 flex flex-1 items-end p-4 pb-2"></div>
                <div class="relative w-full">
                  <div class="absolute bottom-0 left-0 h-full w-full pt-32" style="background:linear-gradient(0deg, #918a7e 0%, rgba(145, 138, 126, 0) 100%)"></div>
                  <div class="relative z-1 flex w-full flex-col gap-1 self-end p-4 pt-0">
                    <div class="font-heading-now-medium md:text-md line-clamp-2 w-full text-sm leading-6 text-wrap text-ellipsis lg:text-lg lg:leading-7" data-testid="item-title">Kai Cenat</div>
                    <div class="ease font-heading-now-regular lg:text-md max-h-0 transform overflow-hidden text-sm leading-tight transition-[max-height,margin] duration-250 group-hover:mb-1 group-hover:max-h-[100px]" data-testid="item-type">Lote</div>
                    <div class="flex items-center leading-none" data-testid="vbuck-price">
                      <span style="position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);white-space:nowrap;word-wrap:normal">Precio de los paVos</span>
                      <span class="font-heading-now-medium text-sm md:text-md flex items-center leading-none relative w-max uppercase" data-testid="current-vbuck-price">
                        <svg viewBox="0 0 24 24" class="w-[1em] h-[1em] inline-block text-[1.5rem] me-1" aria-hidden="true" data-testid="VBucksIcon">
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5ZM10.1051 7.5H6L9.31376 16.5H14.6306L18 7.5H13.8887L12.0896 13.7038L12.0031 14.0427H11.9784L11.9042 13.7038L10.1051 7.5Z"></path>
                        </svg>1800
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
        <div class="relative min-w-0 p-1.5 row-span-1 col-span-1" data-testid="grid-catalog-item">
          <div class="z-1 hover-outline focus-outline group relative flex h-full w-full overflow-hidden rounded-lg bg-black/30 transition-[scale,opacity] focus-within:bg-black/50 hover:bg-black/50 aspect-[.627] scale-100 opacity-100" data-testid="shoes-tile">
            <a class="z-1 flex h-full w-full" data-discover="true" href="/item-shop/kicks/air-jordan-4-retro-og-bred-48905cbe?lang=es-ES">
              <div class="relative z-10 flex w-full flex-col justify-between">
                <div class="z-10 w-full px-2 pt-2">
                  <div class="translate-x-0 opacity-100 delay-300 flex text-black items-center overflow-hidden whitespace-nowrap rounded-full px-3 py-2 w-max max-w-full leading-tight transition-[translate,opacity] bg-yellow-100">
                    <div class="relative flex w-full font-heading-now-bold text-2xs uppercase italic">
                      <div class="relative flex w-full overflow-hidden align-middle">
                        <div class="pe-1">¡Nuevo!</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="z-10 flex flex-1 items-end p-4 pb-2"></div>
                <div class="relative w-full">
                  <div class="absolute bottom-0 left-0 h-full w-full pt-32" style="background:linear-gradient(0deg, #918a7e 0%, rgba(145, 138, 126, 0) 100%)"></div>
                  <div class="relative z-1 flex w-full flex-col gap-1 self-end p-4 pt-0">
                    <div class="font-heading-now-medium md:text-md line-clamp-2 w-full text-sm leading-6 text-wrap text-ellipsis lg:text-lg lg:leading-7" data-testid="item-title">Air Jordan 4 Retro OG "Bred"</div>
                    <div class="ease font-heading-now-regular lg:text-md max-h-0 transform overflow-hidden text-sm leading-tight transition-[max-height,margin] duration-250 group-hover:mb-1 group-hover:max-h-[100px]" data-testid="item-type">Calzado</div>
                    <div class="flex items-center leading-none" data-testid="vbuck-price">
                      <span style="position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);white-space:nowrap;word-wrap:normal">Precio de los paVos</span>
                      <span class="font-heading-now-medium text-sm md:text-md flex items-center leading-none relative w-max uppercase" data-testid="current-vbuck-price">
                        <svg viewBox="0 0 24 24" class="w-[1em] h-[1em] inline-block text-[1.5rem] me-1" aria-hidden="true" data-testid="VBucksIcon">
                          <path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M12 22.5C17.799 22.5 22.5 17.799 22.5 12C22.5 6.20101 17.799 1.5 12 1.5C6.20101 1.5 1.5 6.20101 1.5 12C1.5 17.799 6.20101 22.5 12 22.5ZM10.1051 7.5H6L9.31376 16.5H14.6306L18 7.5H13.8887L12.0896 13.7038L12.0031 14.0427H11.9784L11.9042 13.7038L10.1051 7.5Z"></path>
                        </svg>1000
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
`;

// Función principal
async function main() {
  const scraper = new FortniteExampleScraper();

  try {
    console.log('🚀 Iniciando web scraper de ejemplo con HTML de Fortnite...\n');
    
    const datos = await scraper.procesarHTML(htmlEjemplo);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Procesamiento completado exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en el procesamiento:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { FortniteExampleScraper, type Producto, type Categoria, type TiendaFortnite };
