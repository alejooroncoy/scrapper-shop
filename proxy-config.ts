// Configuración de Proxies - Lista proporcionada
// Formato: ip:puerto:usuario:contraseña

export interface ProxyConfig {
  server: string;
  username: string;
  password: string;
  url: string; // URL completa para autenticación
}

// Lista de proxies proporcionados
const PROXY_LIST = [
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-77lwe66d_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-macygn9m_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-r5t8flm6_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-sa47gcuv_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-ck3udef8_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-5vyzbnzu_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-jhetq5cp_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-8kdznd5t_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-xt9g8433_lifetime-24h',
  '91.239.130.17:44443:mr88293mZj1:M7UvzaedeG_session-i1zru8f6_lifetime-24h'
];

// Función para parsear un proxy string
function parseProxyString(proxyString: string): ProxyConfig {
  const [ip, port, username, password] = proxyString.split(':');
  
  return {
    server: `http://${ip}:${port}`,
    username,
    password,
    url: `http://${username}:${password}@${ip}:${port}`
  };
}

// Configuraciones de proxies parseadas
export const PROXY_CONFIGS: ProxyConfig[] = PROXY_LIST.map(parseProxyString);

// Función para obtener un proxy aleatorio
export function getRandomProxy(): ProxyConfig {
  const randomIndex = Math.floor(Math.random() * PROXY_CONFIGS.length);
  return PROXY_CONFIGS[randomIndex];
}

// Función para obtener un proxy por índice (para rotación secuencial)
export function getProxyByIndex(index: number): ProxyConfig {
  return PROXY_CONFIGS[index % PROXY_CONFIGS.length];
}

// Función para obtener todos los proxies
export function getAllProxies(): ProxyConfig[] {
  return PROXY_CONFIGS;
}

// Configuración por defecto (primer proxy)
export const DEFAULT_PROXY = PROXY_CONFIGS[0];

// Información de los proxies
export const PROXY_INFO = {
  total: PROXY_CONFIGS.length,
  server: '91.239.130.17',
  port: '44443',
  username: 'mr88293mZj1',
  sessions: PROXY_CONFIGS.map((proxy, index) => ({
    index,
    sessionId: proxy.password.split('_session-')[1]?.split('_lifetime')[0] || `session-${index}`,
    lifetime: '24h'
  }))
};

// Función para mostrar información de los proxies
export function displayProxyInfo(): void {
  console.log('🔐 Configuración de Proxies:');
  console.log(`📊 Total de proxies: ${PROXY_INFO.total}`);
  console.log(`🖥️  Servidor: ${PROXY_INFO.server}:${PROXY_INFO.port}`);
  console.log(`👤 Usuario: ${PROXY_INFO.username}`);
  console.log('📋 Sesiones disponibles:');
  
  PROXY_INFO.sessions.forEach((session, index) => {
    console.log(`   ${index + 1}. ${session.sessionId} (${session.lifetime})`);
  });
}

// Función para probar un proxy específico
export async function testProxy(proxyIndex: number = 0): Promise<boolean> {
  const proxy = getProxyByIndex(proxyIndex);
  
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--proxy-server=${proxy.server}`
      ]
    });

    const page = await browser.newPage();
    
    // Configurar autenticación del proxy
    await page.authenticate({
      username: proxy.username,
      password: proxy.password
    });
    
    // Navegar a una página para verificar IP
    await page.goto('https://ipinfo.io/json', { waitUntil: 'networkidle2' });
    
    const ipInfo = await page.evaluate(() => {
      const body = document.body.textContent;
      try {
        return JSON.parse(body || '{}');
      } catch {
        return { error: 'No se pudo parsear JSON' };
      }
    });
    
    console.log(`✅ Proxy ${proxyIndex + 1} funcionando:`);
    console.log(`   📍 IP: ${ipInfo.ip}`);
    console.log(`   🌍 País: ${ipInfo.country}`);
    console.log(`   🏙️ Ciudad: ${ipInfo.city}`);
    
    await browser.close();
    return true;
    
  } catch (error) {
    console.log(`❌ Error con proxy ${proxyIndex + 1}:`, error.message);
    return false;
  }
}

// Función para probar todos los proxies
export async function testAllProxies(): Promise<void> {
  console.log('🧪 Probando todos los proxies...\n');
  
  for (let i = 0; i < PROXY_CONFIGS.length; i++) {
    await testProxy(i);
    console.log(''); // Línea en blanco entre pruebas
  }
}
