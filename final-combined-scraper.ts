import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { FORTNITE_COOKIES } from './cookies-config';

// Interfaces para tipado
interface ImagenProducto {
  url: string;
  resolution: string;
  width: number;
}

interface ProductoCompleto {
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
  offerId: string; // OfferId del producto
  englishTitle: string;
  urlName: string;
  assetType: string;
}

interface Categoria {
  name: string;
  products: ProductoCompleto[];
}

interface TiendaFortniteCompleta {
  categories: Categoria[];
  offerId: string; // OfferId general del catalog
  scrapingDate: string;
  totalProducts: number;
  totalOfferIds: number;
}

class FinalCombinedScraper {
  private browser: Browser | null = null;
  
  // Configuración de cookies - actualizar cuando expiren
  private cookies = FORTNITE_COOKIES;
  private baseUrl = 'https://www.fortnite.com';

  // Método para actualizar cookies cuando expiren
  updateCookies(newCookies: any[]) {
    this.cookies = newCookies;
    console.log('🍪 Cookies actualizadas');
  }

  async scrapeTiendaCompleta(url: string): Promise<TiendaFortniteCompleta> {
    try {
      console.log('🔍 Iniciando scraping completo (HTML + Remix Context)...');
      
      // Configuración de proxy (opcional)
      const proxyConfig = process.env.PROXY_URL ? {
        server: process.env.PROXY_URL, // ej: 'http://proxy-server:port'
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
      } : undefined;

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
          ...(proxyConfig ? [`--proxy-server=${proxyConfig.server}`] : [])
        ]
      });

      const page = await this.browser.newPage();
      
      // Configurar proxy con autenticación si está disponible
      if (proxyConfig && proxyConfig.username && proxyConfig.password) {
        await page.authenticate({
          username: proxyConfig.username,
          password: proxyConfig.password
        });
        console.log('🔐 Proxy configurado con autenticación');
      } else if (proxyConfig) {
        console.log('🌐 Proxy configurado sin autenticación');
      }
      
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
    console.log('🍪 Configurando cookies...');
    await page.setCookie(...this.cookies);

    console.log('🌐 Navegando a la página...');
    
    // Navegar a la página
    await page.goto(url, { 
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

      // Intentar esperar por el selector de productos
      try {
        await page.waitForSelector('[data-testid="grid-catalog-item"]', { timeout: 15000 });
        console.log('✅ Selector de productos encontrado');
      } catch (error) {
        console.log('⚠️ Selector de productos no encontrado, continuando...');
      }

      // Extraer window.__remixContext para obtener offerIds
      console.log('🔍 Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (window as any).__remixContext;
      });

      let offerIdGeneral = 'No encontrado';
      let productosConOfferId: any[] = [];
      
      if (remixContext) {
        console.log('✅ window.__remixContext encontrado');
        offerIdGeneral = this.extraerOfferIdGeneral(remixContext) || 'No encontrado';
        productosConOfferId = this.extraerProductosConOfferId(remixContext);
        console.log(`🆔 OfferId general: ${offerIdGeneral}`);
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
      const categorias = await this.procesarHTML(html, productosConOfferId);

      return {
        categories: categorias,
        offerId: offerIdGeneral,
        scrapingDate: new Date().toISOString(),
        totalProducts: categorias.reduce((total, cat) => total + cat.products.length, 0),
        totalOfferIds: productosConOfferId.length
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

  private extraerOfferIdGeneral(remixContext: any): string | null {
    try {
      return this.buscarOfferIdRecursivo(remixContext);
    } catch (error) {
      console.error('❌ Error extrayendo offerId general:', error);
      return null;
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

  private buscarOfferIdRecursivo(obj: any, profundidad: number = 0): string | null {
    if (profundidad > 10) return null;
    if (typeof obj !== 'object' || obj === null) return null;

    if (obj.offerId && typeof obj.offerId === 'string') {
      return obj.offerId;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const resultado = this.buscarOfferIdRecursivo(item, profundidad + 1);
        if (resultado) return resultado;
      }
    } else {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const resultado = this.buscarOfferIdRecursivo(obj[key], profundidad + 1);
          if (resultado) return resultado;
        }
      }
    }

    return null;
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

  private async procesarHTML(html: string, productosConOfferId: any[]): Promise<Categoria[]> {
    try {
      console.log('🔍 Procesando HTML para extraer productos...');
      
      const $ = cheerio.load(html);
      console.log('✅ HTML cargado correctamente');

      const categoriasMap = new Map<string, Categoria>();
      const productosGlobales = new Set<string>();

      // Buscar secciones con productos agrupados
      this.extraerCategoriasPorSecciones($, categoriasMap, productosGlobales, productosConOfferId);
      
      // Si no se encontraron categorías, buscar por grupos de productos
      if (categoriasMap.size === 0) {
        this.extraerCategoriasPorGrupos($, categoriasMap, productosGlobales, productosConOfferId);
      }
      
      // Si aún no hay categorías, crear una categoría general
      if (categoriasMap.size === 0) {
        this.extraerCategoriaGeneral($, categoriasMap, productosGlobales, productosConOfferId);
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

  private extraerCategoriasPorSecciones($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>, productosConOfferId: any[]): void {
    $('section[id], div[id]').each((_, section) => {
      const $section = $(section);
      const sectionId = $section.attr('id');
      
      if (sectionId && sectionId !== 'item-shop') {
        const productos = this.extraerProductos($section, $, productosGlobales, productosConOfferId);
        
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

  private extraerCategoriasPorGrupos($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>, productosConOfferId: any[]): void {
    const contenedores = $('div[class*="container"], div[class*="wrapper"], div[class*="content"]');
    
    contenedores.each((_, contenedor) => {
      const $contenedor = $(contenedor);
      const productos = this.extraerProductos($contenedor, $, productosGlobales, productosConOfferId);
      
      if (productos.length > 0) {
        const categoriaNombre = this.determinarCategoriaPorContexto($contenedor, productos);
        this.agregarProductosACategoria(categoriasMap, categoriaNombre, productos);
      }
    });
  }

  private extraerCategoriaGeneral($: cheerio.CheerioAPI, categoriasMap: Map<string, Categoria>, productosGlobales: Set<string>, productosConOfferId: any[]): void {
    const todosLosProductos = this.extraerProductos($('body'), $, productosGlobales, productosConOfferId);
    
    if (todosLosProductos.length > 0) {
      const productosPorTipo = new Map<string, ProductoCompleto[]>();
      
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

  private extraerProductos($section: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, productosGlobales: Set<string>, productosConOfferId: any[]): ProductoCompleto[] {
    const productos: ProductoCompleto[] = [];

    $section.find('[data-testid="grid-catalog-item"]').each((_, item) => {
      const $item = $(item);
      const producto = this.extraerDatosProducto($item, $, productosConOfferId);
      
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

  private extraerDatosProducto($item: cheerio.Cheerio<any>, $: cheerio.CheerioAPI, productosConOfferId: any[]): ProductoCompleto | null {
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

      // Buscar el offerId correspondiente al producto
      const productoConOfferId = this.buscarOfferIdPorProducto(nombre, vbucks, productosConOfferId);

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
        expiration: null,
        offerId: productoConOfferId?.offerId || 'No encontrado',
        englishTitle: productoConOfferId?.englishTitle || nombre,
        urlName: productoConOfferId?.urlName || '',
        color1: productoConOfferId?.color1 || null,
        color2: productoConOfferId?.color2 || null,
        color3: productoConOfferId?.color3 || null,
        assetType: productoConOfferId?.assetType || 'unknown'
      };

    } catch (error) {
      console.warn('⚠️ Error extrayendo datos de producto:', error);
      return null;
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

  private determinarCategoriaPorContexto($contenedor: cheerio.Cheerio<any>, productos: ProductoCompleto[]): string {
    let categoriaNombre = $contenedor.find('h1, h2, h3').first().text().trim();
    
    if (!categoriaNombre) {
      const tipos = productos.map(p => p.type).filter(t => t);
      if (tipos.length > 0 && tipos[0]) {
        categoriaNombre = tipos[0];
      }
    }
    
    return categoriaNombre || 'General';
  }

  private agregarProductosACategoria(categoriasMap: Map<string, Categoria>, categoriaNombre: string, productos: ProductoCompleto[]): void {
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
    const offerIdsUsados = new Set<string>();

    categorias.forEach(categoria => {
      const productosUnicos = categoria.products.filter((producto, index, self) => 
        index === self.findIndex(p => p.name === producto.name && p.url === producto.url)
      );

      // Validar unicidad de offerId
      const productosConOfferIdValido = productosUnicos.map(producto => {
        if (producto.offerId && producto.offerId !== 'No encontrado') {
          if (offerIdsUsados.has(producto.offerId)) {
            console.warn(`⚠️ OfferId duplicado encontrado: ${producto.offerId} para producto: ${producto.name} (${producto.vbucks} VBucks)`);
            return {
              ...producto,
              offerId: 'No encontrado (duplicado)'
            };
          } else {
            offerIdsUsados.add(producto.offerId);
            return producto;
          }
        }
        return producto;
      });

      if (productosConOfferIdValido.length > 0 && categoria.name && !nombresCategorias.has(categoria.name)) {
        nombresCategorias.add(categoria.name);
        categoriasLimpias.push({
          name: categoria.name,
          products: productosConOfferIdValido
        });
      }
    });

    return categoriasLimpias.sort((a, b) => b.products.length - a.products.length);
  }

  // Método para validar la integridad de los datos
  private validarIntegridadDatos(datos: TiendaFortniteCompleta): void {
    console.log('🔍 Validando integridad de los datos...');
    
    const offerIds = new Set<string>();
    const productosDuplicados: string[] = [];
    let totalProductos = 0;
    let productosConOfferId = 0;
    let productosSinOfferId = 0;

    datos.categories.forEach(categoria => {
      categoria.products.forEach(producto => {
        totalProductos++;
        
        if (producto.offerId && producto.offerId !== 'No encontrado' && producto.offerId !== 'No encontrado (duplicado)') {
          productosConOfferId++;
          
          if (offerIds.has(producto.offerId)) {
            productosDuplicados.push(`${producto.name} (${producto.vbucks} VBucks) - ${producto.offerId}`);
          } else {
            offerIds.add(producto.offerId);
          }
        } else {
          productosSinOfferId++;
        }
      });
    });

    console.log(`📊 Validación completada:`);
    console.log(`   Total productos: ${totalProductos}`);
    console.log(`   Productos con offerId válido: ${productosConOfferId}`);
    console.log(`   Productos sin offerId: ${productosSinOfferId}`);
    console.log(`   OfferIds únicos: ${offerIds.size}`);
    
    if (productosDuplicados.length > 0) {
      console.warn(`⚠️ Se encontraron ${productosDuplicados.length} productos con offerId duplicado:`);
      productosDuplicados.forEach(duplicado => console.warn(`   - ${duplicado}`));
    } else {
      console.log('✅ No se encontraron offerIds duplicados');
    }
  }

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: TiendaFortniteCompleta, archivo: string = 'fortnite_shop_final.json'): Promise<void> {
    try {
      // Validar integridad antes de guardar
      this.validarIntegridadDatos(datos);
      
      const jsonString = JSON.stringify(datos, null, 2);
      await Bun.write(archivo, jsonString);
      console.log(`💾 Datos guardados en ${archivo}`);
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      throw error;
    }
  }

  // Método para mostrar un resumen de los datos
  mostrarResumen(datos: TiendaFortniteCompleta): void {
    console.log('\n📊 RESUMEN FINAL DE LA TIENDA DE FORTNITE');
    console.log('==========================================');
    console.log(`📅 Fecha de scraping: ${new Date(datos.scrapingDate).toLocaleString('es-ES')}`);
    console.log(`🆔 OfferId general: ${datos.offerId}`);
    console.log(`📦 Total de categorías: ${datos.categories.length}`);
    console.log(`🛍️ Total de productos: ${datos.totalProducts}`);
    console.log(`🆔 Total de offerIds encontrados: ${datos.totalOfferIds}`);
    
    let totalProductos = 0;
    let totalNuevos = 0;
    let totalConDescuento = 0;
    let productosConOfferId = 0;

    datos.categories.forEach(categoria => {
      console.log(`\n🏷️  ${categoria.name}: ${categoria.products.length} productos`);
      
      categoria.products.forEach(producto => {
        totalProductos++;
        if (producto.isNew) totalNuevos++;
        if (producto.discount) totalConDescuento++;
        if (producto.offerId !== 'No encontrado') productosConOfferId++;
        
        console.log(`   • ${producto.name} - ${producto.vbucks} VBucks (${producto.type})`);
        console.log(`     🆔 OfferId: ${producto.offerId}`);
        if (producto.isNew) console.log('     🆕 ¡NUEVO!');
        if (producto.discount) console.log(`     💰 ${producto.discount}`);
        if (producto.originalPrice) console.log(`     📉 Precio original: ${producto.originalPrice} VBucks`);
        if (producto.images.length > 0) console.log(`     🖼️ ${producto.images.length} imagen(es) disponible(s)`);
      });
    });

    console.log('\n📈 ESTADÍSTICAS FINALES:');
    console.log(`   Total productos: ${totalProductos}`);
    console.log(`   Productos nuevos: ${totalNuevos}`);
    console.log(`   Productos con descuento: ${totalConDescuento}`);
    console.log(`   Productos con offerId: ${productosConOfferId}`);
    console.log(`   Porcentaje con offerId: ${((productosConOfferId / totalProductos) * 100).toFixed(1)}%`);
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
  const scraper = new FinalCombinedScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando web scraper final de Fortnite...\n');
    
    const datos = await scraper.scrapeTiendaCompleta(url);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Scraping final completado exitosamente!');
    
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

export { FinalCombinedScraper, type ProductoCompleto, type Categoria, type TiendaFortniteCompleta, type ImagenProducto };
