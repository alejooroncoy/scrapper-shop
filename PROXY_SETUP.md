# 🌐 Configuración de Proxy para el Scraper

## 📋 **Opciones para Cambiar IP:**

### 1. **Variables de Entorno (Recomendado)**

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Proxy HTTP/HTTPS
PROXY_URL=http://proxy-server:port
PROXY_USERNAME=tu_usuario
PROXY_PASSWORD=tu_password

# O proxy SOCKS5
PROXY_URL=socks5://proxy-server:1080
PROXY_USERNAME=tu_usuario
PROXY_PASSWORD=tu_password

# O proxy con autenticación en URL
PROXY_URL=http://username:password@proxy-server:port
```

### 2. **Servicios de Proxy Populares:**

#### **Gratuitos:**
- **Free Proxy List**: https://free-proxy-list.net/
- **ProxyScrape**: https://proxyscrape.com/
- **Hide.me**: https://hide.me/es/proxy

#### **De Pago (Recomendados):**
- **Bright Data (Luminati)**: https://brightdata.com/
- **Oxylabs**: https://oxylabs.io/
- **Smartproxy**: https://smartproxy.com/
- **ProxyMesh**: https://proxymesh.com/
- **Storm Proxies**: https://stormproxies.com/

### 3. **Configuración por Código:**

Edita `final-combined-scraper.ts` y `server.ts`:

```typescript
// En lugar de usar variables de entorno, puedes hardcodear:
const proxyConfig = {
  server: 'http://tu-proxy:port',
  username: 'tu_usuario',
  password: 'tu_password'
};
```

## 🧪 **Verificar IP:**

```bash
# Verificar IP actual
bun run test-ip.ts

# Verificar con proxy
PROXY_URL=http://proxy:port PROXY_USERNAME=user PROXY_PASSWORD=pass bun run test-ip.ts
```

## 🚀 **Usar con el Scraper:**

```bash
# Con proxy
PROXY_URL=http://proxy:port PROXY_USERNAME=user PROXY_PASSWORD=pass bun run final-combined-scraper.ts

# Con el servidor
PROXY_URL=http://proxy:port PROXY_USERNAME=user PROXY_PASSWORD=pass bun run server.ts
```

## ⚠️ **Consideraciones:**

1. **Velocidad**: Los proxies gratuitos suelen ser más lentos
2. **Confiabilidad**: Los proxies de pago son más estables
3. **Rotación**: Algunos servicios rotan IPs automáticamente
4. **Ubicación**: Elige proxies de países específicos si es necesario

## 🔧 **Troubleshooting:**

### Error de conexión:
```bash
# Verificar que el proxy esté funcionando
curl --proxy http://proxy:port https://httpbin.org/ip
```

### Error de autenticación:
- Verifica usuario y contraseña
- Algunos proxies usan IP whitelist en lugar de auth

### Timeout:
- Aumenta el timeout en el código
- Prueba con un proxy diferente

## 📊 **Monitoreo:**

El scraper mostrará logs como:
```
🔐 Proxy configurado con autenticación
🌐 Proxy configurado sin autenticación
🌐 Sin proxy - usando IP directa
```

## 🎯 **Recomendación:**

Para uso en producción, usa un servicio de proxy de pago con:
- Rotación automática de IPs
- Soporte para múltiples protocolos
- Alta disponibilidad
- Soporte técnico
