# 🎮 Fortnite Shop API

API REST para obtener datos de la tienda de Fortnite con actualización automática diaria.

## 🚀 Características

- ✅ **Actualización automática**: Todos los días a las 7:00 PM (hora Perú)
- ✅ **Rate limiting**: Protección contra DDoS
- ✅ **Múltiples endpoints**: Para diferentes necesidades
- ✅ **Búsqueda de productos**: Filtrado por nombre y descripción
- ✅ **Estadísticas**: Resumen de datos de la tienda
- ✅ **CORS configurado**: Para integración con frontend
- ✅ **Seguridad**: Helmet para headers de seguridad

## 📡 Endpoints Disponibles

### 🏠 **Información General**
- `GET /api` - Documentación de la API
- `GET /api/health` - Estado del servidor

### 🛒 **Datos de la Tienda**
- `GET /api/fortnite-shop` - Todos los datos de la tienda
- `GET /api/fortnite-shop/categories` - Lista de categorías
- `GET /api/fortnite-shop/categories/:name` - Productos de una categoría específica
- `GET /api/fortnite-shop/search?q=query` - Buscar productos
- `GET /api/fortnite-shop/stats` - Estadísticas de la tienda

### 🔄 **Actualización**
- `POST /api/fortnite-shop/update` - Actualización manual (limitado)

## 🛡️ Rate Limiting

- **General**: 100 requests por 15 minutos por IP
- **Actualización manual**: 5 requests por hora por IP

## 🏃‍♂️ Cómo Usar

### 1. **Iniciar el Servidor**
```bash
# Desarrollo (con hot reload)
bun run server:dev

# Producción
bun run server
```

### 2. **Ejecutar Scraper Manualmente**
```bash
bun run scrape
```

### 3. **Ejemplos de Uso**

#### Obtener todos los datos:
```bash
curl http://localhost:3000/api/fortnite-shop
```

#### Buscar productos:
```bash
curl "http://localhost:3000/api/fortnite-shop/search?q=Kai"
```

#### Obtener estadísticas:
```bash
curl http://localhost:3000/api/fortnite-shop/stats
```

#### Obtener productos de una categoría:
```bash
curl http://localhost:3000/api/fortnite-shop/categories/Kai%20Cenat
```

## 📊 Estructura de Respuesta

### Respuesta Exitosa:
```json
{
  "success": true,
  "data": { ... },
  "lastUpdate": "2024-01-15T19:00:00.000Z",
  "message": "Datos obtenidos exitosamente"
}
```

### Respuesta de Error:
```json
{
  "error": "Descripción del error",
  "message": "Mensaje adicional"
}
```

## ⏰ Actualización Automática

El servidor ejecuta automáticamente el scraper todos los días a las **7:00 PM (hora Perú)** usando cron jobs.

## 🔧 Configuración

### Variables de Entorno (opcional):
- `PORT`: Puerto del servidor (default: 3000)
- `FRONTEND_URL`: URL del frontend para CORS (default: http://localhost:3000)

### Personalizar Rate Limiting:
Edita las constantes en `server.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests
  // ...
});
```

## 🚨 Manejo de Errores

- **503**: Servicio no disponible (datos no cargados)
- **404**: Endpoint o recurso no encontrado
- **429**: Rate limit excedido
- **500**: Error interno del servidor

## 🔍 Monitoreo

Usa el endpoint `/api/health` para monitorear:
- Estado del servidor
- Última actualización
- Disponibilidad de datos
- Tiempo de actividad

## 🛠️ Desarrollo

### Estructura del Proyecto:
```
├── server.ts              # Servidor Express
├── puppeteer-scraper.ts   # Scraper principal
├── fortnite_shop_puppeteer.json # Datos extraídos
└── package.json           # Dependencias
```

### Scripts Disponibles:
- `bun run server` - Iniciar servidor
- `bun run server:dev` - Servidor con hot reload
- `bun run scrape` - Ejecutar scraper manualmente

## 📝 Notas Importantes

1. **Primera ejecución**: El servidor cargará los datos existentes del archivo JSON
2. **Actualización automática**: Se ejecuta a las 7 PM hora Perú (medianoche UTC)
3. **Rate limiting**: Protege contra abuso y DDoS
4. **CORS**: Configurado para permitir requests desde tu frontend
5. **Logs**: El servidor registra todas las operaciones importantes

## 🎯 Próximos Pasos

1. Configurar el frontend para consumir la API
2. Implementar autenticación si es necesario
3. Agregar más filtros de búsqueda
4. Implementar cache con Redis (opcional)
5. Agregar métricas y monitoreo avanzado
