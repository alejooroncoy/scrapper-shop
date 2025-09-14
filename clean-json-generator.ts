import * as fs from 'fs';

// Interfaces para tipado
interface Producto {
  name: string;
  englishTitle: string;
  urlName: string;
  offerId: string;
  assetType: string;
  price: number; // Precio en VBucks
  originalPrice?: number;
  discount?: string;
  isNew: boolean;
  images: string[];
  url: string;
  type: string;
  color1?: string;
  color2?: string;
  color3?: string;
}

interface Categoria {
  name: string;
  products: Producto[];
}

interface TiendaLimpia {
  categories: Categoria[];
  totalProducts: number;
  totalCategories: number;
  scrapingDate: string;
}

class CleanJsonGenerator {
  async generarJsonLimpio(): Promise<void> {
    try {
      console.log('🧹 Generando JSON limpio...');
      
      // Leer el archivo final
      const data = JSON.parse(fs.readFileSync('fortnite_shop_final.json', 'utf8'));
      
      const categoriasLimpias: Categoria[] = [];
      
      // Procesar cada categoría
      data.categories.forEach((categoria: any) => {
        const productosLimpios: Producto[] = [];
        
        categoria.products.forEach((producto: any) => {
          // Solo incluir productos con precio válido
          if (producto.vbucks && producto.vbucks > 0) {
            // Usar descuento del pricing si está disponible, sino calcular
            let discountCalculado: string | undefined = undefined;
            if (producto.discount) {
              // Usar el descuento original del campo discount
              discountCalculado = producto.discount;
            } else if (producto.originalPrice && producto.originalPrice > producto.vbucks) {
              // Calcular descuento basado en pricing (originalPrice vs vbucks)
              const descuentoVBucks = producto.originalPrice - producto.vbucks;
              discountCalculado = `${descuentoVBucks} VBucks de descuento`;
            }
            
            const productoLimpio: Producto = {
              name: producto.name,
              englishTitle: producto.englishTitle || producto.name,
              urlName: producto.urlName || '',
              offerId: producto.offerId,
              assetType: producto.assetType || 'unknown',
              price: producto.vbucks,
              originalPrice: producto.originalPrice || undefined,
              discount: discountCalculado,
              isNew: producto.isNew || false,
              images: producto.images ? producto.images.map((img: any) => img.url) : [],
              url: producto.url,
              type: producto.type,
              color1: producto.color1 || undefined,
              color2: producto.color2 || undefined,
              color3: producto.color3 || undefined
            };
            
            productosLimpios.push(productoLimpio);
          }
        });
        
        // Solo incluir categorías con productos válidos
        if (productosLimpios.length > 0) {
          categoriasLimpias.push({
            name: categoria.name,
            products: productosLimpios
          });
        }
      });
      
      // Crear el JSON limpio
      const tiendaLimpia: TiendaLimpia = {
        categories: categoriasLimpias,
        totalProducts: categoriasLimpias.reduce((total, cat) => total + cat.products.length, 0),
        totalCategories: categoriasLimpias.length,
        scrapingDate: data.scrapingDate
      };
      
      // Guardar el JSON limpio
      fs.writeFileSync('fortnite_shop_clean.json', JSON.stringify(tiendaLimpia, null, 2));
      
      console.log('✅ JSON limpio generado: fortnite_shop_clean.json');
      console.log(`📦 Categorías: ${tiendaLimpia.totalCategories}`);
      console.log(`🛍️ Productos: ${tiendaLimpia.totalProducts}`);
      
      // Mostrar resumen por categoría
      console.log('\n📊 RESUMEN POR CATEGORÍA:');
      categoriasLimpias.forEach(categoria => {
        console.log(`🏷️ ${categoria.name}: ${categoria.products.length} productos`);
      });
      
    } catch (error) {
      console.error('❌ Error generando JSON limpio:', error);
      throw error;
    }
  }
  
  async limpiarArchivosInnecesarios(): Promise<void> {
    try {
      console.log('\n🗑️ Limpiando archivos innecesarios...');
      
      const archivosAEliminar = [
        'fortnite_shop_combined.json',
        'fortnite_shop_puppeteer.json',
        'fortnite_shop_example.json',
        'remix_context_data.json',
        'productos_con_offerid.json'
      ];
      
      archivosAEliminar.forEach(archivo => {
        if (fs.existsSync(archivo)) {
          fs.unlinkSync(archivo);
          console.log(`🗑️ Eliminado: ${archivo}`);
        }
      });
      
      console.log('✅ Archivos innecesarios eliminados');
      
    } catch (error) {
      console.error('❌ Error limpiando archivos:', error);
      throw error;
    }
  }
  
  mostrarResumenFinal(): void {
    console.log('\n📊 RESUMEN FINAL:');
    console.log('==================');
    console.log('📁 Archivos mantenidos:');
    console.log('   • fortnite_shop_clean.json - JSON limpio con categorías y productos');
    console.log('   • fortnite_shop_final.json - JSON completo (respaldo)');
    console.log('   • *.ts - Scripts de scraping');
    console.log('   • package.json, tsconfig.json - Configuración');
    console.log('\n🎯 El archivo principal es: fortnite_shop_clean.json');
  }
}

// Función principal
async function main() {
  const generator = new CleanJsonGenerator();
  
  try {
    console.log('🚀 Iniciando generación de JSON limpio...\n');
    
    // Generar JSON limpio
    await generator.generarJsonLimpio();
    
    // Limpiar archivos innecesarios
    await generator.limpiarArchivosInnecesarios();
    
    // Mostrar resumen final
    generator.mostrarResumenFinal();
    
    console.log('\n✅ Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main();
}

export { CleanJsonGenerator, type Producto, type Categoria, type TiendaLimpia };
