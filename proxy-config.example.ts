// Configuración de Proxy - Ejemplo
// Copia este archivo como proxy-config.ts y configura tus valores

export const PROXY_CONFIG = {
  // Opción 1: Proxy HTTP/HTTPS
  http: {
    server: 'http://proxy-server:port',
    username: 'tu_usuario',
    password: 'tu_password'
  },
  
  // Opción 2: Proxy SOCKS5
  socks5: {
    server: 'socks5://proxy-server:1080',
    username: 'tu_usuario',
    password: 'tu_password'
  },
  
  // Opción 3: Proxy con autenticación en URL
  url: 'http://username:password@proxy-server:port'
};

// Servicios de proxy populares:
// - Bright Data (Luminati)
// - Oxylabs
// - Smartproxy
// - ProxyMesh
// - Storm Proxies
// - IPRoyal

// Para usar, descomenta una opción y configura los valores
