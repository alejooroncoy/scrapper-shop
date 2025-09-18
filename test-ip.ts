import puppeteer from 'puppeteer';

async function verificarIP() {
  console.log('🔍 Verificando IP actual...');
  
  // Configuración de proxy (opcional)
  const proxyConfig = process.env.PROXY_URL ? {
    server: process.env.PROXY_URL,
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  } : undefined;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      ...(proxyConfig ? [`--proxy-server=${proxyConfig.server}`] : [])
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Configurar proxy con autenticación si está disponible
    if (proxyConfig && proxyConfig.username && proxyConfig.password) {
      await page.authenticate({
        username: proxyConfig.username,
        password: proxyConfig.password
      });
      console.log('🔐 Proxy configurado con autenticación');
    } else if (proxyConfig) {
      console.log('🌐 Proxy configurado sin autenticación');
    } else {
      console.log('🌐 Sin proxy - usando IP directa');
    }
    
    // Navegar a un servicio que muestre la IP
    console.log('📡 Verificando IP en whatismyipaddress.com...');
    await page.goto('https://whatismyipaddress.com/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Esperar a que se cargue la página
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extraer la IP
    const ipInfo = await page.evaluate(() => {
      const ipElement = document.querySelector('#ipv4');
      const locationElement = document.querySelector('#location');
      
      return {
        ip: ipElement?.textContent?.trim() || 'No encontrada',
        location: locationElement?.textContent?.trim() || 'No encontrada'
      };
    });
    
    console.log('📍 IP detectada:', ipInfo.ip);
    console.log('🌍 Ubicación:', ipInfo.location);
    
    // También verificar en otro servicio
    console.log('\n📡 Verificando en ipinfo.io...');
    await page.goto('https://ipinfo.io/json', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const ipInfo2 = await page.evaluate(() => {
      const body = document.body.textContent;
      try {
        return JSON.parse(body || '{}');
      } catch {
        return { error: 'No se pudo parsear JSON' };
      }
    });
    
    console.log('📍 IP info:', ipInfo2.ip);
    console.log('🌍 País:', ipInfo2.country);
    console.log('🏙️ Ciudad:', ipInfo2.city);
    console.log('🏢 ISP:', ipInfo2.org);
    
  } finally {
    await browser.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarIP().catch(console.error);
}

export { verificarIP };
