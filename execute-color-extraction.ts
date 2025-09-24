import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function ejecutarExtraccionColores() {
  try {
    console.log('🎨 Ejecutando extracción de colores...');
    
    // Importar la función desde server.ts
    const { ejecutarExtraccionColores } = await import('./server');
    
    // Ejecutar la función
    await ejecutarExtraccionColores();
    
    console.log('✅ Extracción de colores completada!');
    
  } catch (error) {
    console.error('❌ Error ejecutando extracción de colores:', error);
  }
}

// Ejecutar la función
ejecutarExtraccionColores();
