import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { CleanJsonGenerator } from './clean-json-generator';

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware de seguridad
app.use(helmet());

// CORS configurado para permitir requests desde tu frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Cambia por tu URL del frontend
  credentials: true
}));

// Rate limiting para prevenir DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP cada 15 minutos
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting más estricto para el endpoint de actualización manual
const updateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 actualizaciones manuales por IP por hora
  message: {
    error: 'Límite de actualizaciones manuales excedido. Máximo 5 por hora.',
    retryAfter: '1 hora'
  }
});

app.use(limiter);

// Middleware para parsear JSON
app.use(express.json());

// Variable para almacenar los datos en memoria
let fortniteData: any = null;
let lastUpdate: Date | null = null;

// Función para cargar datos desde el archivo JSON más reciente
async function cargarDatos(): Promise<void> {
  try {
    // Buscar el archivo JSON más reciente
    const files = await fs.readdir(__dirname);
    const jsonFiles = files.filter(file => 
      file.startsWith('fortnite_shop_') && 
      file.endsWith('.json') &&
      !file.includes('clean')
    );
    
    if (jsonFiles.length === 0) {
      // Si no hay archivos con timestamp, usar el clean
      const filePath = path.join(__dirname, 'fortnite_shop_clean.json');
      const data = await fs.readFile(filePath, 'utf-8');
      fortniteData = JSON.parse(data);
      console.log('✅ Datos cargados desde fortnite_shop_clean.json');
    } else {
      // Usar el archivo más reciente
      const latestFile = jsonFiles.sort().pop();
      const filePath = path.join(__dirname, latestFile!);
      const data = await fs.readFile(filePath, 'utf-8');
      fortniteData = JSON.parse(data);
      console.log(`✅ Datos cargados desde ${latestFile}`);
    }
    
    lastUpdate = new Date();
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    fortniteData = null;
  }
}

// Función para ejecutar el scraper completo
async function ejecutarScraper(): Promise<void> {
  try {
    console.log('🔄 Iniciando actualización automática del scraper...');
    
    // Ejecutar el scraper final que genera el JSON limpio
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Ejecutar el scraper final con proxy aleatorio (por defecto)
    console.log('📦 Ejecutando scraper final con proxy aleatorio...');
    await execAsync('bun run final-combined-scraper.ts');
    
    // Generar JSON limpio
    console.log('🧹 Generando JSON limpio...');
    const generator = new CleanJsonGenerator();
    await generator.generarJsonLimpio();
    
    // Extraer colores de los productos
    console.log('🎨 Extrayendo colores de los productos...');
    await ejecutarExtraccionColores();
    
    // Recargar los datos después del scraping
    console.log('🔄 Recargando datos en el servidor...');

    await cargarDatos();
    console.log('✅ Actualización automática completada');
  } catch (error) {
    console.error('❌ Error en actualización automática:', error);
  }
}

// Función para extraer colores de los productos
async function ejecutarExtraccionColores(): Promise<void> {
  try {
    const puppeteer = await import('puppeteer');
    const fs = await import('fs');
    const { getRandomProxy } = await import('./proxy-config');
    
    // Usar proxy aleatorio por defecto
    const proxyConfig = getRandomProxy();
    console.log('🎲 Seleccionando proxy aleatorio para extracción de colores...');

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
      console.log(`🔐 Proxy configurado para extracción de colores: ${proxyConfig.server}`);
      console.log(`👤 Usuario: ${proxyConfig.username}`);
      console.log(`🆔 Sesión: ${proxyConfig.password.split('_session-')[1]?.split('_lifetime')[0] || 'N/A'}`);
      
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
      const { FORTNITE_COOKIES } = await import('./cookies-config');
      console.log('🍪 Configurando cookies para extracción de colores...');
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
        return (globalThis as any).__remixContext;
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
      
      const jsonExistente = JSON.parse(fs.readFileSync('fortnite_shop_clean.json', 'utf8'));
      let productosConColoresAgregados = 0;
      
      jsonExistente.categories.forEach((categoria: any) => {
        categoria.products.forEach((producto: any) => {
          const productoConColores = productosConColores.find(p => p.offerId === producto.offerId);
          if (productoConColores) {
            if (productoConColores.color1 || productoConColores.color2 || productoConColores.color3) {
              producto.color1 = productoConColores.color1 || undefined;
              producto.color2 = productoConColores.color2 || undefined;
              producto.color3 = productoConColores.color3 || undefined;
              productosConColoresAgregados++;
            }
          }
        });
      });
      
      fs.writeFileSync('fortnite_shop_clean.json', JSON.stringify(jsonExistente, null, 2));
      
      console.log(`🎨 Colores agregados a ${productosConColoresAgregados} productos`);
      
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('❌ Error extrayendo colores:', error);
  }
}

// Endpoint principal - obtener todos los datos (JSON limpio)
app.get('/api/fortnite-shop', async (req, res) => {
  try {
    if (!fortniteData) {
      await cargarDatos();
    }

    if (!fortniteData) {
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible',
        message: 'Los datos no están disponibles en este momento'
      });
    }

    res.json({
      success: true,
      data: fortniteData,
      lastUpdate: lastUpdate?.toISOString(),
      message: 'Datos obtenidos exitosamente (JSON limpio con precios en VBucks y descuentos del pricing)'
    });
  } catch (error) {
    console.error('Error en endpoint principal:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los datos'
    });
  }
});

// Endpoint para obtener el JSON limpio directamente
app.get('/api/fortnite-shop/clean', async (req, res) => {
  try {
    if (!fortniteData) {
      await cargarDatos();
    }

    if (!fortniteData) {
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible',
        message: 'Los datos no están disponibles en este momento'
      });
    }

    // Retornar directamente el JSON limpio sin wrapper adicional
    res.json(fortniteData);
  } catch (error) {
    console.error('Error en endpoint clean:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los datos'
    });
  }
});

// Endpoint para obtener solo las categorías
app.get('/api/fortnite-shop/categories', async (req, res) => {
  try {
    if (!fortniteData) {
      await cargarDatos();
    }

    if (!fortniteData) {
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible'
      });
    }

    const categories = fortniteData.categories?.map((cat: any) => ({
      name: cat.name,
      productCount: cat.products?.length || 0
    })) || [];

    res.json({
      success: true,
      data: categories,
      lastUpdate: lastUpdate?.toISOString()
    });
  } catch (error) {
    console.error('Error en endpoint de categorías:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para obtener productos de una categoría específica
app.get('/api/fortnite-shop/categories/:categoryName', async (req, res) => {
  try {
    if (!fortniteData) {
      await cargarDatos();
    }

    if (!fortniteData) {
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible'
      });
    }

    const categoryName = decodeURIComponent(req.params.categoryName);
    const category = fortniteData.categories?.find((cat: any) => 
      cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      return res.status(404).json({
        error: 'Categoría no encontrada',
        message: `La categoría "${categoryName}" no existe`
      });
    }

    res.json({
      success: true,
      data: category,
      lastUpdate: lastUpdate?.toISOString()
    });
  } catch (error) {
    console.error('Error en endpoint de categoría específica:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para buscar productos
app.get('/api/fortnite-shop/search', async (req, res) => {
  try {
    if (!fortniteData) {
      await cargarDatos();
    }

    if (!fortniteData) {
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible'
      });
    }

    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({
        error: 'Parámetro de búsqueda requerido',
        message: 'Usa ?q=tu_búsqueda'
      });
    }

    const searchResults: any[] = [];
    fortniteData.categories?.forEach((category: any) => {
      category.products?.forEach((product: any) => {
        if (product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.description?.toLowerCase().includes(query.toLowerCase())) {
          searchResults.push({
            ...product,
            category: category.name
          });
        }
      });
    });

    res.json({
      success: true,
      data: searchResults,
      query: query,
      count: searchResults.length,
      lastUpdate: lastUpdate?.toISOString()
    });
  } catch (error) {
    console.error('Error en endpoint de búsqueda:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para obtener estadísticas
app.get('/api/fortnite-shop/stats', async (req, res) => {
  try {
    if (!fortniteData) {
      await cargarDatos();
    }

    if (!fortniteData) {
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible'
      });
    }

    let totalProducts = 0;
    let totalNew = 0;
    let totalDiscounted = 0;
    const categoryStats: any[] = [];

    fortniteData.categories?.forEach((category: any) => {
      const productCount = category.products?.length || 0;
      const newCount = category.products?.filter((p: any) => p.isNew).length || 0;
      const discountedCount = category.products?.filter((p: any) => p.discount).length || 0;

      totalProducts += productCount;
      totalNew += newCount;
      totalDiscounted += discountedCount;

      categoryStats.push({
        name: category.name,
        productCount,
        newCount,
        discountedCount
      });
    });

    res.json({
      success: true,
      data: {
        totalCategories: fortniteData.categories?.length || 0,
        totalProducts,
        totalNew,
        totalDiscounted,
        categories: categoryStats,
        lastUpdate: lastUpdate?.toISOString()
      }
    });
  } catch (error) {
    console.error('Error en endpoint de estadísticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Endpoint para actualización manual (con rate limiting estricto)
app.post('/api/fortnite-shop/update', updateLimiter, async (req, res) => {
  try {
    console.log('🔄 Actualización manual solicitada...');
    await ejecutarScraper();
    
    res.json({
      success: true,
      message: 'Datos actualizados exitosamente',
      lastUpdate: lastUpdate?.toISOString()
    });
  } catch (error) {
    console.error('Error en actualización manual:', error);
    res.status(500).json({
      error: 'Error al actualizar los datos',
      message: 'Intenta de nuevo más tarde'
    });
  }
});

// Endpoint de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    lastUpdate: lastUpdate?.toISOString() || null,
    dataAvailable: !!fortniteData,
    dataSource: fortniteData?.scrapingDate || 'No disponible'
  });
});

// Endpoint de información de la API
app.get('/api', (req, res) => {
  res.json({
    name: 'Fortnite Shop API',
    version: '2.0.0',
    description: 'API para obtener datos de la tienda de Fortnite con JSON limpio',
    features: [
      'JSON limpio con precios en VBucks',
      'Descuentos extraídos del pricing',
      'OfferId para cada producto',
      'Categorías organizadas',
      'Búsqueda de productos',
      'Estadísticas detalladas'
    ],
    endpoints: {
      'GET /api/fortnite-shop': 'Obtener todos los datos de la tienda (con wrapper)',
      'GET /api/fortnite-shop/clean': 'Obtener JSON limpio directamente',
      'GET /api/fortnite-shop/categories': 'Obtener lista de categorías',
      'GET /api/fortnite-shop/categories/:name': 'Obtener productos de una categoría',
      'GET /api/fortnite-shop/search?q=query': 'Buscar productos',
      'GET /api/fortnite-shop/stats': 'Obtener estadísticas',
      'POST /api/fortnite-shop/update': 'Actualizar datos manualmente',
      'GET /api/health': 'Estado del servidor'
    },
    dataStructure: {
      categories: 'Array de categorías',
      totalProducts: 'Número total de productos',
      totalCategories: 'Número total de categorías',
      scrapingDate: 'Fecha del último scraping',
      products: {
        name: 'Nombre del producto',
        englishTitle: 'Título en inglés',
        urlName: 'Nombre en URL',
        offerId: 'ID único de la oferta',
        assetType: 'Tipo de asset',
        price: 'Precio en VBucks',
        originalPrice: 'Precio original (si aplica)',
        discount: 'Descuento extraído del pricing',
        isNew: 'Si es producto nuevo',
        images: 'Array de URLs de imágenes',
        url: 'URL del producto',
        type: 'Tipo de producto'
      }
    },
    rateLimits: {
      general: '100 requests por 15 minutos',
      update: '5 actualizaciones por hora'
    }
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    message: 'Revisa la documentación en /api'
  });
});

// Manejo global de errores
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: 'Algo salió mal'
  });
});

// Configurar cron job para actualización automática a las 7 PM (hora Perú)
// Perú está en UTC-5, así que 7 PM Perú = 12 AM UTC (medianoche)
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Ejecutando actualización automática programada...');
  await ejecutarScraper();
}, {
  timezone: 'America/Lima'
});

// Inicializar el servidor
async function iniciarServidor() {
  try {
    // Cargar datos iniciales
    await cargarDatos();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 Servidor Express iniciado');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`📚 Documentación: http://localhost:${PORT}/api`);
      console.log(`💚 Salud: http://localhost:${PORT}/api/health`);
      console.log('⏰ Actualización automática: Todos los días a las 7:00 PM (hora Perú) con proxy aleatorio');
      console.log('🛡️  Rate limiting activado para prevenir DDoS');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Iniciar el servidor
iniciarServidor();
