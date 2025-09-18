// Ejemplo de cómo hardcodear un proxy en el código
// NO recomendado para producción, solo para pruebas

import puppeteer from 'puppeteer';

async function ejemploConProxyHardcodeado() {
  // Configuración de proxy hardcodeada
  const proxyConfig = {
    server: 'http://123.456.789.012:8080', // Reemplaza con tu proxy
    username: 'tu_usuario',                // Reemplaza con tu usuario
    password: 'tu_password'                // Reemplaza con tu contraseña
  };

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${proxyConfig.server}`
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Configurar autenticación del proxy
    await page.authenticate({
      username: proxyConfig.username,
      password: proxyConfig.password
    });
    
    console.log('🔐 Proxy configurado:', proxyConfig.server);
    
    // Navegar a una página para verificar IP
    await page.goto('https://ipinfo.io/json');
    
    const ipInfo = await page.evaluate(() => {
      const body = document.body.textContent;
      try {
        return JSON.parse(body || '{}');
      } catch {
        return { error: 'No se pudo parsear JSON' };
      }
    });
    
    console.log('📍 IP detectada:', ipInfo.ip);
    console.log('🌍 País:', ipInfo.country);
    console.log('🏙️ Ciudad:', ipInfo.city);
    
  } finally {
    await browser.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejemploConProxyHardcodeado().catch(console.error);
}

export { ejemploConProxyHardcodeado };
