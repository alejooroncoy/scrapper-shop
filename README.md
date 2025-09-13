# Web Scraper de Fortnite Item Shop

Este proyecto contiene un web scraper para extraer información de la tienda de artículos de Fortnite. El scraper puede extraer categorías, productos, precios en VBucks, descuentos, productos nuevos y más información relevante.

## 🚀 Características

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

### 1. Scraper con HTML de ejemplo (Recomendado para pruebas)

```bash
bun run example-scraper.ts
```

Este método procesa el HTML de ejemplo que proporcionaste y demuestra cómo funciona el scraper.

### 2. Scraper con Puppeteer (Para scraping real)

```bash
bun run puppeteer-scraper.ts
```

Este método usa Puppeteer para simular un navegador real y puede acceder a sitios web protegidos.

### 3. Scraper básico con fetch

```bash
bun run index.ts
```

Este método usa fetch directo (puede ser bloqueado por algunos sitios).

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

## 📈 Ejemplo de Salida

```
📊 RESUMEN DE LA TIENDA DE FORTNITE
=====================================
📅 Fecha de scraping: 13/9/2025, 12:56:08
📦 Total de categorías: 1

🏷️  Kai Cenat: 3 productos
   • Lote de Kai Cenat - 3500 VBucks (Lote)
     💰 4700 paVos de descuento
     📉 Precio original: 8200 VBucks
   • Kai Cenat - 1800 VBucks (Lote)
   • Air Jordan 4 Retro OG "Bred" - 1000 VBucks (Calzado)
     🆕 ¡NUEVO!

📈 ESTADÍSTICAS:
   Total productos: 3
   Productos nuevos: 1
   Productos con descuento: 1
```

## 🚨 Consideraciones Importantes

1. **Respeto a los términos de servicio**: Asegúrate de cumplir con los términos de servicio de Fortnite
2. **Rate limiting**: No hagas scraping demasiado frecuente para evitar ser bloqueado
3. **User-Agent**: El scraper usa un User-Agent realista para evitar detección
4. **Datos en tiempo real**: Los datos pueden cambiar frecuentemente en la tienda

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