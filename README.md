# Web Scraper de Fortnite Item Shop v2.0

Este proyecto contiene un web scraper avanzado para extraer información de la tienda de artículos de Fortnite. El scraper puede extraer categorías, productos, precios en VBucks, descuentos, productos nuevos y más información relevante.

## 🚀 Características Principales

### ✨ Nuevas Funcionalidades v2.0
- **Sistema de logging avanzado** con niveles configurables
- **Manejo robusto de errores** con reintentos automáticos
- **Configuración flexible** via argumentos de línea de comandos
- **Métricas de rendimiento** integradas
- **Soporte mejorado de proxies** con rotación automática
- **Simulación de comportamiento humano** optimizada

### 🔧 Funcionalidades Core
- **Extracción completa de datos**: Nombres, descripciones, tipos, precios en VBucks, imágenes, URLs
- **Detección de descuentos**: Identifica productos con descuentos y precios originales
- **Productos nuevos**: Detecta automáticamente productos marcados como nuevos
- **Múltiples métodos**: Scraping con fetch directo, Puppeteer para sitios protegidos, y procesamiento de HTML de ejemplo
- **Exportación JSON**: Guarda los datos en formato JSON estructurado
- **Estadísticas**: Muestra resúmenes detallados de los datos extraídos

## 📦 Instalación

```bash
# Instalar dependencias
bun install
```

## 🛠️ Uso

### 🆕 Scraper Final v2.0 (Recomendado)

```bash
# Uso básico con proxy aleatorio
bun run final-combined-scraper.ts

# Con proxy específico
bun run final-combined-scraper.ts --proxy=1

# Sin proxy
bun run final-combined-scraper.ts --no-proxy

# Configuración avanzada
bun run final-combined-scraper.ts --timeout=120000 --retries=5 --log-level=debug
```

### 📚 Ejemplos de Uso

```bash
# Ejemplo básico
bun run ejemplo-scraper-v2.ts

# Ejemplo avanzado con configuración personalizada
bun run ejemplo-scraper-v2.ts --avanzado

# Ejemplo con reintentos
bun run ejemplo-scraper-v2.ts --reintentos

# Ejemplo de logging
bun run ejemplo-scraper-v2.ts --logging
```

### 🔧 Argumentos de Línea de Comandos

| Argumento | Descripción | Ejemplo |
|-----------|-------------|---------|
| `--proxy=N` | Usar proxy específico (1-10) | `--proxy=1` |
| `--proxy-random` | Usar proxy aleatorio | `--proxy-random` |
| `--no-proxy` | Sin proxy | `--no-proxy` |
| `--timeout=N` | Timeout en milisegundos | `--timeout=120000` |
| `--retries=N` | Número de reintentos | `--retries=5` |
| `--delay=N` | Delay entre requests (ms) | `--delay=3000` |
| `--headless=false` | Modo visible | `--headless=false` |
| `--log-level=LEVEL` | Nivel de log | `--log-level=debug` |

### 📖 Métodos Legacy

```bash
# Scraper con HTML de ejemplo (para pruebas)
bun run example-scraper.ts

# Scraper con Puppeteer básico
bun run puppeteer-scraper.ts

# Scraper básico con fetch
bun run index.ts
```

## 📊 Estructura de Datos

El scraper extrae la siguiente información:

```typescript
interface Producto {
  nombre: string;           // Nombre del producto
  descripcion: string | null; // Descripción/tipo del producto
  tipo: string;            // Categoría del producto (Lote, Calzado, etc.)
  vbucks: number;          // Precio en VBucks
  precioOriginal: number | null; // Precio original si hay descuento
  descuento: string | null; // Texto del descuento
  esNuevo: boolean;        // Si es un producto nuevo
  imagen: string;          // URL de la imagen
  url: string;            // URL del producto
  vencimiento: string | null; // Fecha de vencimiento (si está disponible)
}

interface Categoria {
  nombre: string;          // Nombre de la categoría
  productos: Producto[];   // Lista de productos en la categoría
}

interface TiendaFortnite {
  categorias: Categoria[]; // Lista de categorías
  fechaScraping: string;   // Fecha y hora del scraping
}
```

## 📁 Archivos del Proyecto

- `index.ts` - Scraper básico con fetch
- `example-scraper.ts` - Scraper que procesa HTML de ejemplo
- `puppeteer-scraper.ts` - Scraper con Puppeteer para sitios protegidos
- `package.json` - Configuración del proyecto y dependencias
- `README.md` - Este archivo de documentación

## 🔧 Configuración

### Headless Mode

Para ver el navegador durante el scraping (útil para debugging), cambia en `puppeteer-scraper.ts`:

```typescript
this.browser = await puppeteer.launch({
  headless: false, // Cambiar a false para ver el navegador
  // ... resto de configuración
});
```

### Timeouts

Puedes ajustar los timeouts en el archivo `puppeteer-scraper.ts`:

```typescript
await page.goto(url, { 
  waitUntil: 'networkidle2',
  timeout: 30000 // 30 segundos
});
```

## 📈 Ejemplo de Salida v2.0

```
📊 RESUMEN FINAL DE LA TIENDA DE FORTNITE
==========================================
📅 Fecha de scraping: 21/1/2025, 15:30:45
🆔 OfferId general: 8a8a8a8a-8a8a-8a8a-8a8a-8a8a8a8a8a8a
📦 Total de categorías: 3
🛍️ Total de productos: 15
🆔 Total de offerIds encontrados: 12
⏱️ Duración del scraping: 4.25s
🌐 Proxy usado: http://91.239.130.17:44443 (mr88293mZj1)
📋 Versión: 2.0.0

🏷️  Skins: 8 productos
   • Skin 1 - 1200 VBucks (Skin)
     🆔 OfferId: abc123-def456-ghi789
     🆕 ¡NUEVO!
   • Skin 2 - 800 VBucks (Skin)
     🆔 OfferId: xyz789-uvw456-rst123

🏷️  Emotes: 4 productos
   • Emote 1 - 500 VBucks (Emote)
     🆔 OfferId: emo123-emo456-emo789

🏷️  Pickaxes: 3 productos
   • Pickaxe 1 - 800 VBucks (Pickaxe)
     🆔 OfferId: pic123-pic456-pic789

📈 ESTADÍSTICAS FINALES:
   Total productos: 15
   Productos nuevos: 3
   Productos con descuento: 2
   Productos con offerId: 12
   Porcentaje con offerId: 80.0%
   Categorías con productos: 3
   Promedio productos por categoría: 5.0

📊 ESTADÍSTICAS DE RENDIMIENTO:
================================
⏱️ Duración total: 4.25s
🔄 Intentos realizados: 1
🌐 Proxy usado: http://91.239.130.17:44443 (mr88293mZj1)
📦 Productos por segundo: 3.53
🆔 OfferIds por segundo: 2.82
```

## 🆕 Nuevas Funcionalidades v2.0

### 🔧 Sistema de Configuración Avanzado
- **Configuración por constructor**: Personaliza timeouts, reintentos, delays
- **Argumentos de línea de comandos**: Control total desde la terminal
- **Configuración de logging**: Niveles debug, info, warn, error
- **Modo headless configurable**: Para debugging visual

### 🛡️ Manejo Robusto de Errores
- **Reintentos automáticos**: Configurable hasta 10 intentos
- **Limpieza de recursos**: Gestión automática de memoria
- **Logging detallado**: Información completa de errores
- **Recuperación inteligente**: Continúa después de errores temporales

### 📊 Métricas y Monitoreo
- **Estadísticas de rendimiento**: Productos/segundo, duración total
- **Información de proxy**: Tracking de conexiones utilizadas
- **Validación de datos**: Detección de duplicados y errores
- **Reportes detallados**: Resúmenes completos con métricas

### 🌐 Soporte de Proxy Mejorado
- **Rotación automática**: 10 proxies configurados
- **Selección inteligente**: Proxy aleatorio o específico
- **Información de conexión**: Tracking de IPs y sesiones
- **Fallback automático**: Cambio de proxy en caso de error

## 🚨 Consideraciones Importantes

1. **Respeto a los términos de servicio**: Asegúrate de cumplir con los términos de servicio de Fortnite
2. **Rate limiting**: No hagas scraping demasiado frecuente para evitar ser bloqueado
3. **User-Agent**: El scraper usa un User-Agent realista para evitar detección
4. **Datos en tiempo real**: Los datos pueden cambiar frecuentemente en la tienda
5. **Uso de proxies**: Los proxies ayudan a evitar bloqueos pero respeta los límites

## 🛡️ Solución de Problemas

### Error 403 Forbidden
- Usa el scraper con Puppeteer en lugar del scraper básico
- Verifica que el User-Agent sea correcto

### Timeout errors
- Aumenta el timeout en la configuración
- Verifica tu conexión a internet

### No se encuentran productos
- Verifica que los selectores CSS sean correctos
- La estructura de la página puede haber cambiado

## 📝 Licencia

Este proyecto es para fines educativos y de demostración. Úsalo responsablemente y respeta los términos de servicio de los sitios web que scrapees.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas, por favor abre un issue en el repositorio.