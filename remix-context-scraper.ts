import puppeteer, { Browser, Page } from 'puppeteer';

// Interfaces para tipado
interface RemixContext {
  loaderData: {
    routes: {
      'item-shop': {
        _index: {
          catalog: any;
        };
      };
    };
  };
}

interface OfferData {
  offerId: string;
  catalog: any;
  catalogInfo: {
    sections: any[];
    items: any[];
    totalSections: number;
    totalItems: number;
  };
  scrapingDate: string;
}

class RemixContextScraper {
  private browser: Browser | null = null;
  private baseUrl = 'https://www.fortnite.com';

  async extraerRemixContext(url: string): Promise<OfferData> {
    try {
      console.log('🔍 Iniciando extracción de window.__remixContext...');
      
      // Inicializar Puppeteer
      this.browser = await puppeteer.launch({
        headless: true, // Cambiar a false para ver el navegador
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await this.browser.newPage();
      
      // Configurar user agent y headers
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Configurar viewport
      await page.setViewport({ width: 1920, height: 1080 });

      console.log('🌐 Navegando a la página...');
      
      // Navegar a la página
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Esperar un poco más para que se cargue el contenido dinámico
      console.log('⏳ Esperando a que se cargue el contenido...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Intentar esperar por el selector, pero no fallar si no se encuentra
      try {
        await page.waitForSelector('[data-testid="grid-catalog-item"]', { timeout: 15000 });
        console.log('✅ Selector de productos encontrado');
      } catch (error) {
        console.log('⚠️ Selector de productos no encontrado, continuando...');
      }

      // Extraer window.__remixContext
      console.log('🔍 Extrayendo window.__remixContext...');
      const remixContext = await page.evaluate(() => {
        return (window as any).__remixContext;
      });

      if (!remixContext) {
        throw new Error('No se encontró window.__remixContext en la página');
      }

      console.log('✅ window.__remixContext encontrado');

      // Cerrar el navegador
      await this.browser.close();
      this.browser = null;

      // Procesar el contexto de Remix
      return this.procesarRemixContext(remixContext);

    } catch (error) {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.error('❌ Error durante la extracción:', error);
      throw error;
    }
  }

  private procesarRemixContext(remixContext: any): OfferData {
    try {
      console.log('🔍 Procesando contexto de Remix...');
      
      // Primero, inspeccionar la estructura del contexto
      console.log('📋 Estructura del contexto de Remix:');
      console.log('Claves principales:', Object.keys(remixContext));
      
      // Buscar offerId en toda la estructura del contexto
      const offerId = this.buscarOfferIdRecursivo(remixContext);
      
      if (!offerId) {
        console.warn('⚠️ No se encontró offerId en el contexto de Remix');
        
        // Mostrar más información sobre la estructura para debugging
        console.log('🔍 Estructura detallada del contexto:');
        this.mostrarEstructuraDetallada(remixContext, 0, 3);
      } else {
        console.log(`✅ OfferId encontrado: ${offerId}`);
      }

      // Extraer información específica del catalog
      const catalogInfo = this.extraerInformacionCatalog(remixContext);

      return {
        offerId: offerId || 'No encontrado',
        catalog: remixContext,
        catalogInfo: catalogInfo,
        scrapingDate: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error procesando contexto de Remix:', error);
      throw error;
    }
  }

  private extraerOfferId(catalog: any): string | null {
    try {
      console.log('🔍 Buscando offerId en el catalog...');
      
      // Buscar offerId en diferentes ubicaciones posibles del catalog
      if (catalog.offerId) {
        console.log(`✅ OfferId encontrado directamente: ${catalog.offerId}`);
        return catalog.offerId;
      }

      // Buscar en entries si existe
      if (catalog.entries && Array.isArray(catalog.entries)) {
        for (const entry of catalog.entries) {
          if (entry.offerId) {
            console.log(`✅ OfferId encontrado en entries: ${entry.offerId}`);
            return entry.offerId;
          }
        }
      }

      // Buscar en items si existe
      if (catalog.items && Array.isArray(catalog.items)) {
        for (const item of catalog.items) {
          if (item.offerId) {
            console.log(`✅ OfferId encontrado en items: ${item.offerId}`);
            return item.offerId;
          }
        }
      }

      // Buscar en sections si existe
      if (catalog.sections && Array.isArray(catalog.sections)) {
        for (const section of catalog.sections) {
          if (section.offerId) {
            console.log(`✅ OfferId encontrado en sections: ${section.offerId}`);
            return section.offerId;
          }
          
          // Buscar en items de la sección
          if (section.items && Array.isArray(section.items)) {
            for (const item of section.items) {
              if (item.offerId) {
                console.log(`✅ OfferId encontrado en section.items: ${item.offerId}`);
                return item.offerId;
              }
            }
          }
        }
      }

      // Buscar recursivamente en todo el objeto
      const offerIdRecursivo = this.buscarOfferIdRecursivo(catalog);
      if (offerIdRecursivo) {
        console.log(`✅ OfferId encontrado recursivamente: ${offerIdRecursivo}`);
        return offerIdRecursivo;
      }

      console.log('⚠️ No se encontró offerId en ninguna ubicación');
      return null;

    } catch (error) {
      console.error('❌ Error extrayendo offerId:', error);
      return null;
    }
  }

  private buscarOfferIdRecursivo(obj: any, profundidad: number = 0): string | null {
    // Limitar la profundidad de búsqueda para evitar bucles infinitos
    if (profundidad > 10) {
      return null;
    }

    if (typeof obj !== 'object' || obj === null) {
      return null;
    }

    // Buscar directamente offerId
    if (obj.offerId && typeof obj.offerId === 'string') {
      return obj.offerId;
    }

    // Buscar en arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const resultado = this.buscarOfferIdRecursivo(item, profundidad + 1);
        if (resultado) {
          return resultado;
        }
      }
    } else {
      // Buscar en propiedades del objeto
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const resultado = this.buscarOfferIdRecursivo(obj[key], profundidad + 1);
          if (resultado) {
            return resultado;
          }
        }
      }
    }

    return null;
  }

  private extraerInformacionCatalog(remixContext: any): { sections: any[]; items: any[]; totalSections: number; totalItems: number } {
    try {
      console.log('🔍 Extrayendo información específica del catalog...');
      
      let sections: any[] = [];
      let items: any[] = [];
      
      // Buscar en la estructura del contexto
      if (remixContext.state && remixContext.state.loaderData) {
        const loaderData = remixContext.state.loaderData;
        
        // Buscar en diferentes rutas posibles
        const rutas = ['item-shop', 'root', 'routes'];
        
        for (const ruta of rutas) {
          if (loaderData[ruta]) {
            const datosRuta = loaderData[ruta];
            
            // Buscar catalog directamente
            if (datosRuta.catalog) {
              const catalog = datosRuta.catalog;
              if (catalog.sections) {
                sections = catalog.sections;
                console.log(`✅ Secciones encontradas en ${ruta}: ${sections.length}`);
              }
              if (catalog.items) {
                items = catalog.items;
                console.log(`✅ Items encontrados en ${ruta}: ${items.length}`);
              }
            }
            
            // Buscar en _index si existe
            if (datosRuta._index && datosRuta._index.catalog) {
              const catalog = datosRuta._index.catalog;
              if (catalog.sections) {
                sections = catalog.sections;
                console.log(`✅ Secciones encontradas en ${ruta}._index: ${sections.length}`);
              }
              if (catalog.items) {
                items = catalog.items;
                console.log(`✅ Items encontrados en ${ruta}._index: ${items.length}`);
              }
            }
          }
        }
      }
      
      // Si no se encontraron secciones/items, buscar recursivamente
      if (sections.length === 0) {
        sections = this.buscarRecursivamente(remixContext, 'sections');
        console.log(`✅ Secciones encontradas recursivamente: ${sections.length}`);
      }
      
      if (items.length === 0) {
        items = this.buscarRecursivamente(remixContext, 'items');
        console.log(`✅ Items encontrados recursivamente: ${items.length}`);
      }
      
      return {
        sections: sections,
        items: items,
        totalSections: sections.length,
        totalItems: items.length
      };
      
    } catch (error) {
      console.error('❌ Error extrayendo información del catalog:', error);
      return {
        sections: [],
        items: [],
        totalSections: 0,
        totalItems: 0
      };
    }
  }

  private buscarRecursivamente(obj: any, clave: string, profundidad: number = 0): any[] {
    if (profundidad > 5) return [];
    
    if (typeof obj !== 'object' || obj === null) return [];
    
    // Si es un array, buscar en cada elemento
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const resultado = this.buscarRecursivamente(item, clave, profundidad + 1);
        if (resultado.length > 0) return resultado;
      }
    } else {
      // Si tiene la clave que buscamos, devolverla
      if (obj.hasOwnProperty(clave) && Array.isArray(obj[clave])) {
        return obj[clave];
      }
      
      // Buscar en las propiedades del objeto
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const resultado = this.buscarRecursivamente(obj[key], clave, profundidad + 1);
          if (resultado.length > 0) return resultado;
        }
      }
    }
    
    return [];
  }

  private mostrarEstructuraDetallada(obj: any, nivel: number, maxNivel: number): void {
    if (nivel > maxNivel) return;
    
    const indentacion = '  '.repeat(nivel);
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        console.log(`${indentacion}[Array con ${obj.length} elementos]`);
        if (obj.length > 0 && nivel < maxNivel) {
          console.log(`${indentacion}  Primer elemento:`, typeof obj[0]);
          if (typeof obj[0] === 'object' && obj[0] !== null) {
            this.mostrarEstructuraDetallada(obj[0], nivel + 2, maxNivel);
          }
        }
      } else {
        const claves = Object.keys(obj);
        console.log(`${indentacion}{${claves.length} propiedades: ${claves.slice(0, 10).join(', ')}${claves.length > 10 ? '...' : ''}}`);
        
        if (nivel < maxNivel) {
          // Mostrar algunas propiedades importantes
          const propiedadesImportantes = ['offerId', 'catalog', 'loaderData', 'routes', 'item-shop', '_index'];
          for (const clave of propiedadesImportantes) {
            if (obj.hasOwnProperty(clave)) {
              console.log(`${indentacion}  ${clave}:`, typeof obj[clave]);
              if (typeof obj[clave] === 'object' && obj[clave] !== null && nivel + 1 < maxNivel) {
                this.mostrarEstructuraDetallada(obj[clave], nivel + 2, maxNivel);
              }
            }
          }
        }
      }
    } else {
      console.log(`${indentacion}${typeof obj}: ${obj}`);
    }
  }

  // Método para guardar los datos en un archivo JSON
  async guardarDatos(datos: OfferData, archivo: string = 'remix_context_data.json'): Promise<void> {
    try {
      const jsonString = JSON.stringify(datos, null, 2);
      await Bun.write(archivo, jsonString);
      console.log(`💾 Datos guardados en ${archivo}`);
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      throw error;
    }
  }

  // Método para mostrar un resumen de los datos
  mostrarResumen(datos: OfferData): void {
    console.log('\n📊 RESUMEN DE LA EXTRACCIÓN DE REMIX CONTEXT');
    console.log('=============================================');
    console.log(`📅 Fecha de scraping: ${new Date(datos.scrapingDate).toLocaleString('es-ES')}`);
    console.log(`🆔 OfferId: ${datos.offerId}`);
    
    if (datos.catalogInfo) {
      console.log('\n📦 INFORMACIÓN DEL CATALOG:');
      console.log(`   Total de secciones: ${datos.catalogInfo.totalSections}`);
      console.log(`   Total de items: ${datos.catalogInfo.totalItems}`);
      
      if (datos.catalogInfo.sections.length > 0) {
        console.log('\n🏷️ SECCIONES ENCONTRADAS:');
        datos.catalogInfo.sections.slice(0, 5).forEach((section: any, index: number) => {
          console.log(`   ${index + 1}. ${section.name || section.id || 'Sin nombre'}`);
          if (section.items && Array.isArray(section.items)) {
            console.log(`      Items: ${section.items.length}`);
          }
        });
        if (datos.catalogInfo.sections.length > 5) {
          console.log(`   ... y ${datos.catalogInfo.sections.length - 5} secciones más`);
        }
      }
      
      if (datos.catalogInfo.items.length > 0) {
        console.log('\n🛍️ ITEMS ENCONTRADOS:');
        datos.catalogInfo.items.slice(0, 5).forEach((item: any, index: number) => {
          console.log(`   ${index + 1}. ${item.name || item.title || 'Sin nombre'}`);
          if (item.price) {
            console.log(`      Precio: ${item.price}`);
          }
        });
        if (datos.catalogInfo.items.length > 5) {
          console.log(`   ... y ${datos.catalogInfo.items.length - 5} items más`);
        }
      }
    }
    
    if (datos.catalog) {
      console.log('\n🔍 ESTRUCTURA DEL CONTEXTO:');
      const claves = Object.keys(datos.catalog);
      console.log(`   Claves principales: ${claves.join(', ')}`);
    }
  }

  // Método para cerrar el navegador si es necesario
  async cerrar(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Función principal
async function main() {
  const scraper = new RemixContextScraper();
  const url = 'https://www.fortnite.com/item-shop?lang=es-ES';

  try {
    console.log('🚀 Iniciando extracción de window.__remixContext...\n');
    
    const datos = await scraper.extraerRemixContext(url);
    
    // Mostrar resumen
    scraper.mostrarResumen(datos);
    
    // Guardar datos
    await scraper.guardarDatos(datos);
    
    console.log('\n✅ Extracción completada exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en la extracción:', error);
    await scraper.cerrar();
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { RemixContextScraper, type OfferData, type RemixContext };
