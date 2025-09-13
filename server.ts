import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { FortnitePuppeteerScraper } from './puppeteer-scraper';

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware de seguridad
app.use(helmet());

// CORS configurado para permitir requests desde tu frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://www.fastpavos.com/', // Cambia por tu URL del frontend
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

// Función para cargar datos desde el archivo JSON
async function cargarDatos(): Promise<void> {
  try {
    const filePath = path.join(__dirname, 'fortnite_shop_puppeteer.json');
    const data = await fs.readFile(filePath, 'utf-8');
    fortniteData = JSON.parse(data);
    lastUpdate = new Date();
    console.log('✅ Datos cargados desde el archivo JSON');
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    fortniteData = null;
  }
}

// Función para ejecutar el scraper
async function ejecutarScraper(): Promise<void> {
  try {
    console.log('🔄 Iniciando actualización automática del scraper...');
    const scraper = new FortnitePuppeteerScraper();
    await scraper.scrapeTienda('https://www.fortnite.com/item-shop?lang=es-ES');
    
    // Recargar los datos después del scraping
    await cargarDatos();
    console.log('✅ Actualización automática completada');
  } catch (error) {
    console.error('❌ Error en actualización automática:', error);
  }
}

// Endpoint principal - obtener todos los datos
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
      message: 'Datos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error en endpoint principal:', error);
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
    dataAvailable: !!fortniteData
  });
});

// Endpoint de información de la API
app.get('/api', (req, res) => {
  res.json({
    name: 'Fortnite Shop API',
    version: '1.0.0',
    description: 'API para obtener datos de la tienda de Fortnite',
    endpoints: {
      'GET /api/fortnite-shop': 'Obtener todos los datos de la tienda',
      'GET /api/fortnite-shop/categories': 'Obtener lista de categorías',
      'GET /api/fortnite-shop/categories/:name': 'Obtener productos de una categoría',
      'GET /api/fortnite-shop/search?q=query': 'Buscar productos',
      'GET /api/fortnite-shop/stats': 'Obtener estadísticas',
      'POST /api/fortnite-shop/update': 'Actualizar datos manualmente',
      'GET /api/health': 'Estado del servidor'
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
      console.log('⏰ Actualización automática: Todos los días a las 7:00 PM (hora Perú)');
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
