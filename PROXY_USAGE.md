# 🔐 Guía de Uso de Proxies

Esta guía explica cómo usar los proxies configurados en el proyecto de web scraping de Fortnite.

## 📋 Proxies Disponibles

Se han configurado **10 proxies** con las siguientes características:
- **Servidor**: 91.239.130.17:44443
- **Usuario**: mr88293mZj1
- **Sesiones**: 10 sesiones diferentes con duración de 24 horas
- **Formato**: HTTP con autenticación

## 🚀 Cómo Usar los Proxies

### 1. Probar los Proxies

Antes de usar los proxies, es recomendable probarlos:

```bash
# Probar todos los proxies
bun test-proxies.ts --all

# Probar un proxy aleatorio
bun test-proxies.ts --random

# Probar un proxy específico (1-10)
bun test-proxies.ts --index=1
```

### 2. Usar Proxies en el Scraper

#### Opción A: Proxy Aleatorio
```bash
bun final-combined-scraper.ts --proxy-random
```

#### Opción B: Proxy Específico
```bash
# Usar proxy 1
bun final-combined-scraper.ts --proxy=1

# Usar proxy 5
bun final-combined-scraper.ts --proxy=5
```

#### Opción C: Sin Proxy
```bash
bun final-combined-scraper.ts --no-proxy
```

#### Opción D: Sin Argumentos (proxy aleatorio por defecto - ideal para cron)
```bash
bun final-combined-scraper.ts
```

### 3. Usar Proxies en Código

```typescript
import { FinalCombinedScraper } from './final-combined-scraper';

const scraper = new FinalCombinedScraper();

// Configurar proxy aleatorio
scraper.setProxy(undefined, true);

// Configurar proxy específico (índice 0-9)
scraper.setProxy(0); // Usa el primer proxy

// Desactivar proxy
scraper.disableProxy();

// Ejecutar scraping
const datos = await scraper.scrapeTiendaCompleta('https://www.fortnite.com/item-shop?lang=es-ES');
```

## 🔧 Configuración Técnica

### Comportamiento por Defecto
- **Sin argumentos**: Usa proxy aleatorio automáticamente (ideal para cron jobs)
- **Con argumentos**: Sigue la lógica específica de los argumentos
- **Cron job**: Se ejecuta diariamente a las 7:00 PM (hora Perú) con proxy aleatorio

### Estructura de Proxy
```typescript
interface ProxyConfig {
  server: string;    // http://91.239.130.17:44443
  username: string;  // mr88293mZj1
  password: string;  // M7UvzaedeG_session-XXXXX_lifetime-24h
  url: string;       // URL completa con autenticación
}
```

### Rotación de Proxies
- **Aleatoria**: `getRandomProxy()` - Selecciona un proxy aleatorio
- **Secuencial**: `getProxyByIndex(index)` - Selecciona por índice
- **Todos**: `getAllProxies()` - Obtiene todos los proxies

## 📊 Monitoreo y Diagnóstico

## ⏰ Cron Job Automático

### Configuración del Cron Job
El servidor incluye un cron job que se ejecuta automáticamente:
- **Frecuencia**: Todos los días a las 7:00 PM (hora Perú)
- **Proxy**: Usa proxy aleatorio automáticamente
- **Proceso**: 
  1. Ejecuta el scraper con proxy aleatorio
  2. Genera JSON limpio
  3. Extrae colores de productos (también con proxy aleatorio)
  4. Actualiza los datos en memoria

### Probar el Comportamiento del Cron
```bash
# Simular ejecución de cron (sin argumentos = proxy aleatorio)
bun test-cron-proxy.ts

# Probar selección de proxies aleatorios
bun test-cron-proxy.ts --test-proxy-selection

# Probar extracción de colores con proxy
bun test-extraccion-colores-proxy.ts
```

### Verificar Estado de Proxies
```bash
# Mostrar información de todos los proxies
bun test-proxies.ts

# Probar un proxy específico
bun test-proxies.ts --index=3
```

### Logs de Proxy
El scraper mostrará información detallada sobre el proxy usado:
```
🔐 Proxy configurado: http://91.239.130.17:44443
👤 Usuario: mr88293mZj1
```

## ⚠️ Consideraciones Importantes

### 1. Duración de Sesiones
- Cada proxy tiene una sesión con duración de **24 horas**
- Las sesiones se renuevan automáticamente
- Si un proxy falla, prueba con otro

### 2. Límites de Uso
- No abuses de los proxies para evitar bloqueos
- Usa delays aleatorios entre requests
- Rota entre diferentes proxies

### 3. Fallback
- Si todos los proxies fallan, el scraper puede funcionar sin proxy
- Usa `--no-proxy` para desactivar proxies temporalmente

## 🛠️ Solución de Problemas

### Proxy No Funciona
1. Prueba el proxy individualmente:
   ```bash
   bun test-proxies.ts --index=1
   ```

2. Si falla, prueba con otro proxy:
   ```bash
   bun test-proxies.ts --index=2
   ```

3. Si todos fallan, usa sin proxy:
   ```bash
   bun final-combined-scraper.ts --no-proxy
   ```

### Error de Autenticación
- Verifica que el usuario y contraseña sean correctos
- Asegúrate de que la sesión no haya expirado
- Prueba con una sesión diferente

### Timeout de Conexión
- El proxy puede estar sobrecargado
- Prueba con otro proxy
- Aumenta el timeout en la configuración

## 📈 Mejores Prácticas

1. **Rotación**: Usa diferentes proxies para diferentes requests
2. **Monitoreo**: Prueba los proxies regularmente
3. **Fallback**: Siempre ten un plan B sin proxy
4. **Logs**: Revisa los logs para identificar problemas
5. **Delays**: Usa delays aleatorios para parecer más humano

## 🔄 Actualización de Proxies

Si necesitas actualizar la lista de proxies:

1. Edita el archivo `proxy-config.ts`
2. Actualiza la lista `PROXY_LIST`
3. Prueba los nuevos proxies:
   ```bash
   bun test-proxies.ts --all
   ```

## 📞 Soporte

Si tienes problemas con los proxies:
1. Revisa los logs del scraper
2. Prueba los proxies individualmente
3. Verifica la conectividad a internet
4. Considera usar sin proxy como fallback
