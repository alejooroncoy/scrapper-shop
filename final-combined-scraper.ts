import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { FORTNITE_COOKIES } from './cookies-config';
import { getRandomProxy, getProxyByIndex, type ProxyConfig } from './proxy-config';

// Configuración de logging mejorada
interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

class Logger {
  private static instance: Logger;
  private logLevel: string = 'info';

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: string) {
    this.logLevel = level;
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]) {
    console.log(`✅ [SUCCESS] ${message}`, ...args);
  }

  progress(message: string, ...args: any[]) {
    console.log(`🔄 [PROGRESS] ${message}`, ...args);
  }
}

const logger = Logger.getInstance();

// Interfaces para tipado mejoradas
interface ImagenProducto {
  url: string;
  resolution: string;
  width: number;
  height?: number;
  alt?: string;
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
  offerId: string;
  englishTitle: string;
  urlName: string;
  assetType: string;
  rarity?: string;
  tags?: string[];
  lastUpdated?: string;
}

interface Categoria {
  name: string;
  products: ProductoCompleto[];
  totalProducts: number;
  lastUpdated?: string;
}

interface TiendaFortniteCompleta {
  categories: Categoria[];
  offerId: string;
  scrapingDate: string;
  totalProducts: number;
  totalOfferIds: number;
  scrapingDuration?: number;
  proxyUsed?: string;
  version: string;
}

// Configuración de scraping
interface ScrapingConfig {
  timeout: number;
  retryAttempts: number;
  delayBetweenRequests: number;
  useProxy: boolean;
  proxyIndex?: number;
  useRandomProxy?: boolean;
  headless: boolean;
  logLevel: string;
}

// Resultado de scraping con metadatos
interface ScrapingResult {
  success: boolean;
  data?: TiendaFortniteCompleta;
  error?: string;
  duration: number;
  attempts: number;
  proxyUsed?: string;
}

class FinalCombinedScraper {
  private browser: Browser | null = null;
  private cookies = FORTNITE_COOKIES;
  private baseUrl = 'https://www.fortnite.com';
  private proxyConfig: ProxyConfig | null = null;
  private useProxy: boolean = false;
  private config: ScrapingConfig;
  private startTime: number = 0;
  private retryCount: number = 0;
  
  constructor(config?: Partial<ScrapingConfig>) {
    this.config = {
      timeout: 60000,
      retryAttempts: 3,
      delayBetweenRequests: 2000,
      useProxy: false,
      headless: true,
      logLevel: 'info',
      ...config
    };
    
    logger.setLogLevel(this.config.logLevel);
  }

  // Método para actualizar cookies cuando expiren
  updateCookies(newCookies: any[]) {
    this.cookies = newCookies;
    logger.success('Cookies actualizadas');
  }

  // Método para actualizar configuración
  updateConfig(newConfig: Partial<ScrapingConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.setLogLevel(this.config.logLevel);
    logger.info('Configuración actualizada', newConfig);
  }

  // Método para configurar proxy
  setProxy(proxyIndex?: number, useRandom: boolean = false) {
    if (useRandom) {
      this.proxyConfig = getRandomProxy();
      logger.info('Proxy aleatorio configurado', { server: this.proxyConfig.server });
    } else if (proxyIndex !== undefined) {
      this.proxyConfig = getProxyByIndex(proxyIndex);
      logger.info(`Proxy ${proxyIndex + 1} configurado`, { server: this.proxyConfig.server });
    } else {
      this.proxyConfig = null;
      logger.info('Sin proxy configurado');
    }
    this.useProxy = this.proxyConfig !== null;
  }

  // Método para desactivar proxy
  disableProxy() {
    this.proxyConfig = null;
    this.useProxy = false;
    logger.info('Proxy desactivado');
  }

  // Método para obtener información del proxy actual
  getProxyInfo(): string | null {
    return this.proxyConfig ? `${this.proxyConfig.server} (${this.proxyConfig.username})` : null;
  }

  async scrapeTiendaCompleta(url: string): Promise<ScrapingResult> {
    this.startTime = Date.now();
    this.retryCount = 0;
    
    try {
      logger.info('Iniciando scraping completo (HTML + Remix Context)...');
      logger.debug('Configuración actual', {
        proxy: this.getProxyInfo(),
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts
      });
      
      const result = await this.ejecutarScrapingConReintentos(url);
      
      const duration = Date.now() - this.startTime;
      logger.success(`Scraping completado en ${duration}ms`);
      
      return {
        success: true,
        data: result,
        duration,
        attempts: this.retryCount + 1,
        proxyUsed: this.getProxyInfo() || undefined
      };
      
    } catch (error) {
      const duration = Date.now() - this.startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      logger.error('Error durante el scraping', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        duration,
        attempts: this.retryCount + 1,
        proxyUsed: this.getProxyInfo() || undefined
      };
    }
  }

  private async ejecutarScrapingConReintentos(url: string): Promise<TiendaFortniteCompleta> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      this.retryCount = attempt;
      
      try {
        if (attempt > 0) {
          logger.warn(`Reintento ${attempt}/${this.config.retryAttempts}`);
          await this.delay(this.config.delayBetweenRequests);
        }
        
        return await this.ejecutarScraping(url);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Error desconocido');
        logger.warn(`Intento ${attempt + 1} falló`, lastError.message);
        
        if (attempt === this.config.retryAttempts) {
          throw lastError;
        }
        
        // Limpiar recursos antes del siguiente intento
        await this.limpiarRecursos();
      }
    }
    
    throw lastError || new Error('Error en todos los intentos');
  }

  private async ejecutarScraping(url: string): Promise<TiendaFortniteCompleta> {
    // Usar configuración de proxy si está disponible
    const proxyConfig = this.proxyConfig;

      // Inicializar Puppeteer con configuración mejorada
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
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
          '--disable-default-apps',
          '--disable-sync',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',
          // Proxy args
          ...(proxyConfig ? [`--proxy-server=${proxyConfig.server}`] : [])
        ],
        timeout: this.config.timeout
      });
      
      logger.debug('Navegador iniciado correctamente');

      const page = await this.browser.newPage();
      
      // Configurar timeouts de página
      page.setDefaultTimeout(this.config.timeout);
      page.setDefaultNavigationTimeout(this.config.timeout);
      
      // Configurar proxy con autenticación si está disponible
      if (proxyConfig && proxyConfig.username && proxyConfig.password) {
        await page.authenticate({
          username: proxyConfig.username,
          password: proxyConfig.password
        });
        logger.info('Proxy configurado con autenticación', {
          server: proxyConfig.server,
          username: proxyConfig.username
        });
      } else if (proxyConfig) {
        logger.info('Proxy configurado sin autenticación', { server: proxyConfig.server });
      } else {
        logger.info('Sin proxy configurado');
      }
      
      // Configurar user agent y headers mejorados
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
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
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      });
      
      // Configurar viewport
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      
      // Ocultar detección de automatización
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // Ocultar chrome runtime
        (globalThis as any).chrome = {
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
      logger.info('Configurando cookies...');
      await page.setCookie(...this.cookies);

      logger.info('Navegando a la página...');
      
      // Navegar a la página con mejor manejo de errores
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout 
      });
      
      logger.debug('Página cargada correctamente');


      // Esperar a que se cargue el contenido con delay aleatorio
      logger.info('Esperando a que se cargue el contenido...');
      const randomDelay = Math.floor(Math.random() * 3000) + 3000; // 3-6 segundos
      await this.delay(randomDelay);
      
      // Simular comportamiento humano - mover mouse
      await this.simularComportamientoHumano(page);

      // Intentar esperar por el selector de productos
      try {
        await page.waitForSelector('[data-testid="grid-catalog-item"]', { timeout: 15000 });
        logger.success('Selector de productos encontrado');
      } catch (error) {
        logger.warn('Selector de productos no encontrado, continuando...');
      }

      // Extraer window.__remixContext para obtener offerIds
      logger.info('Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (globalThis as any).__remixContext;
      });

      let offerIdGeneral = 'No encontrado';
      let productosConOfferId: any[] = [];
      
      if (remixContext) {
        logger.success('window.__remixContext encontrado');
        offerIdGeneral = this.extraerOfferIdGeneral(remixContext) || 'No encontrado';
        productosConOfferId = this.extraerProductosConOfferId(remixContext);
        logger.info('Datos extraídos del contexto', {
          offerIdGeneral,
          productosConOfferId: productosConOfferId.length
        });
      } else {
        logger.warn('No se encontró window.__remixContext');
      }

      // Obtener el HTML para extraer productos
      const html = await page.content();
      logger.success('HTML obtenido correctamente');

      // Cerrar el navegador
      await this.limpiarRecursos();

      // Procesar el HTML con Cheerio para extraer productos
      const categorias = await this.procesarHTML(html, productosConOfferId);
      
      const duration = Date.now() - this.startTime;

      return {
        categories: categorias.map(cat => ({
          ...cat,
          totalProducts: cat.products.length,
          lastUpdated: new Date().toISOString()
        })),
        offerId: offerIdGeneral,
        scrapingDate: new Date().toISOString(),
        totalProducts: categorias.reduce((total, cat) => total + cat.products.length, 0),
        totalOfferIds: productosConOfferId.length,
        scrapingDuration: duration,
        proxyUsed: this.getProxyInfo() || undefined,
        version: '2.0.0'
      };

  }

  private async simularComportamientoHumano(page: Page): Promise<void> {
    try {
      // Mover mouse de forma natural
      await page.mouse.move(100, 100);
      await this.delay(1000);
      await page.mouse.move(200, 200);
      await this.delay(500);
      
      // Simular scroll suave
      await page.evaluate(() => {
        (globalThis as any).scrollTo({ top: 100, behavior: 'smooth' });
      });
      await this.delay(1000);
      
      logger.debug('Comportamiento humano simulado');
    } catch (error) {
      logger.warn('Error simulando comportamiento humano', error);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async limpiarRecursos(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        logger.debug('Navegador cerrado correctamente');
      } catch (error) {
        logger.warn('Error cerrando navegador', error);
      } finally {
        this.browser = null;
      }
    }
  }

  private extraerOfferIdGeneral(remixContext: any): string | null {
    try {
      return this.buscarOfferIdRecursivo(remixContext);
    } catch (error) {
      logger.error('Error extrayendo offerId general', error);
      return null;
    }
  }

  private extraerProductosConOfferId(remixContext: any): any[] {
    try {
      const productos: any[] = [];
      this.buscarProductosRecursivamente(remixContext, productos);
      return productos;
    } catch (error) {
      logger.error('Error extrayendo productos con offerId', error);
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
      logger.info('Procesando HTML para extraer productos...');
      
      const $ = cheerio.load(html);
      logger.success('HTML cargado correctamente');

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

      logger.info('Categorías procesadas', {
        categorias: categories.length,
        productosUnicos: productosGlobales.size
      });

      return categories;

    } catch (error) {
      logger.error('Error durante el procesamiento', error);
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
          
          logger.debug(`Categoría encontrada: "${categoriaNombre}" (${sectionId}) - ${productos.length} productos`);
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
        assetType: productoConOfferId?.assetType || 'unknown'
      };

    } catch (error) {
      logger.warn('Error extrayendo datos de producto', error);
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
        products: productos,
        totalProducts: productos.length
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
            logger.warn(`OfferId duplicado encontrado: ${producto.offerId} para producto: ${producto.name} (${producto.vbucks} VBucks)`);
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
          products: productosConOfferIdValido,
          totalProducts: productosConOfferIdValido.length
        });
      }
    });

    return categoriasLimpias.sort((a, b) => b.products.length - a.products.length);
  }

  // Método para validar la integridad de los datos
  private validarIntegridadDatos(datos: TiendaFortniteCompleta): void {
    logger.info('Validando integridad de los datos...');
    
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

    logger.info('Validación completada', {
      totalProductos,
      productosConOfferId,
      productosSinOfferId,
      offerIdsUnicos: offerIds.size
    });
    
    if (productosDuplicados.length > 0) {
      logger.warn(`Se encontraron ${productosDuplicados.length} productos con offerId duplicado`);
      productosDuplicados.forEach(duplicado => logger.warn(`- ${duplicado}`));
    } else {
      logger.success('No se encontraron offerIds duplicados');
    }
  }

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: TiendaFortniteCompleta, archivo: string = 'fortnite_shop_final.json'): Promise<void> {
    try {
      // Validar integridad antes de guardar
      this.validarIntegridadDatos(datos);
      
      const jsonString = JSON.stringify(datos, null, 2);
      await Bun.write(archivo, jsonString);
      logger.success(`Datos guardados en ${archivo}`);
    } catch (error) {
      logger.error('Error guardando datos', error);
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
    console.log(`⏱️ Duración del scraping: ${datos.scrapingDuration ? (datos.scrapingDuration / 1000).toFixed(2) + 's' : 'N/A'}`);
    console.log(`🌐 Proxy usado: ${datos.proxyUsed || 'Ninguno'}`);
    console.log(`📋 Versión: ${datos.version || '1.0.0'}`);
    
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
    
    // Estadísticas adicionales
    const categoriasConProductos = datos.categories.filter(cat => cat.products.length > 0).length;
    const promedioProductosPorCategoria = categoriasConProductos > 0 ? (totalProductos / categoriasConProductos).toFixed(1) : '0';
    console.log(`   Categorías con productos: ${categoriasConProductos}`);
    console.log(`   Promedio productos por categoría: ${promedioProductosPorCategoria}`);
  }

  // Método para cerrar el navegador si es necesario
  async cerrar(): Promise<void> {
    await this.limpiarRecursos();
  }

  // Método para obtener estadísticas de rendimiento
  getPerformanceStats(): any {
    return {
      retryCount: this.retryCount,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      proxyUsed: this.getProxyInfo(),
      config: this.config
    };
  }
}

// Función principal mejorada
async function main() {
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';
  
  try {
    console.log('🚀 Iniciando web scraper final de Fortnite v2.0...\n');
    
    // Configurar scraper con argumentos de línea de comandos
    const config = parsearArgumentos();
    const scraper = new FinalCombinedScraper(config);
    
    // Configurar proxy basado en argumentos
    configurarProxy(scraper);
    
    // Ejecutar scraping
    const resultado = await scraper.scrapeTiendaCompleta(url);
    
    if (resultado.success && resultado.data) {
      // Mostrar resumen
      scraper.mostrarResumen(resultado.data);
      
      // Guardar datos
      const archivo = generarNombreArchivo();
      await scraper.guardarDatos(resultado.data, archivo);
      
      // Mostrar estadísticas de rendimiento
      mostrarEstadisticasRendimiento(resultado, scraper);
      
      console.log('\n✅ Scraping final completado exitosamente!');
    } else {
      console.error('\n❌ Error en el scraping:', resultado.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error crítico en el scraping:', error);
    process.exit(1);
  }
}

// Función para parsear argumentos de línea de comandos
function parsearArgumentos(): Partial<ScrapingConfig> {
  const args = process.argv.slice(2);
  const config: Partial<ScrapingConfig> = {};
  
  // Parsear argumentos
  args.forEach(arg => {
    if (arg.startsWith('--timeout=')) {
      config.timeout = parseInt(arg.split('=')[1] || '60000');
    } else if (arg.startsWith('--retries=')) {
      config.retryAttempts = parseInt(arg.split('=')[1] || '3');
    } else if (arg.startsWith('--delay=')) {
      config.delayBetweenRequests = parseInt(arg.split('=')[1] || '2000');
    } else if (arg === '--headless=false') {
      config.headless = false;
    } else if (arg.startsWith('--log-level=')) {
      config.logLevel = arg.split('=')[1] || 'info';
    }
  });
  
  return config;
}

// Función para configurar proxy
function configurarProxy(scraper: FinalCombinedScraper): void {
  const args = process.argv.slice(2);
  
  if (args.includes('--proxy-random') || args.includes('-pr')) {
    scraper.setProxy(undefined, true);
  } else if (args.includes('--proxy') || args.includes('-p')) {
    const proxyArg = args.find(arg => arg.startsWith('--proxy=') || arg.startsWith('-p='));
    if (proxyArg) {
      const proxyIndex = parseInt(proxyArg.split('=')[1] || '0') - 1;
      if (proxyIndex >= 0 && proxyIndex < 10) {
        scraper.setProxy(proxyIndex);
      } else {
        console.log('❌ Índice de proxy inválido. Usa un número entre 1 y 10');
        process.exit(1);
      }
    } else {
      console.log('❌ Debes especificar un índice de proxy. Ejemplo: --proxy=1 o -p=1');
      process.exit(1);
    }
  } else if (args.includes('--no-proxy')) {
    scraper.disableProxy();
  } else {
    // Por defecto, usar proxy aleatorio (ideal para cron)
    scraper.setProxy(undefined, true);
  }
}

// Función para generar nombre de archivo con timestamp
function generarNombreArchivo(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `fortnite_shop_${timestamp}.json`;
}

// Función para mostrar estadísticas de rendimiento
function mostrarEstadisticasRendimiento(resultado: ScrapingResult, scraper: FinalCombinedScraper): void {
  console.log('\n📊 ESTADÍSTICAS DE RENDIMIENTO:');
  console.log('================================');
  console.log(`⏱️ Duración total: ${(resultado.duration / 1000).toFixed(2)}s`);
  console.log(`🔄 Intentos realizados: ${resultado.attempts}`);
  console.log(`🌐 Proxy usado: ${resultado.proxyUsed || 'Ninguno'}`);
  
  if (resultado.data) {
    console.log(`📦 Productos por segundo: ${(resultado.data.totalProducts / (resultado.duration / 1000)).toFixed(2)}`);
    console.log(`🆔 OfferIds por segundo: ${(resultado.data.totalOfferIds / (resultado.duration / 1000)).toFixed(2)}`);
  }
  
  const stats = scraper.getPerformanceStats();
  console.log(`🔧 Configuración usada:`, {
    timeout: stats.config.timeout,
    retryAttempts: stats.config.retryAttempts,
    delayBetweenRequests: stats.config.delayBetweenRequests,
    headless: stats.config.headless
  });
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { 
  FinalCombinedScraper, 
  Logger,
  type ProductoCompleto, 
  type Categoria, 
  type TiendaFortniteCompleta, 
  type ImagenProducto,
  type ScrapingConfig,
  type ScrapingResult
};
