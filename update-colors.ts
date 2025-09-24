import { ejecutarExtraccionColores } from './server';

async function main() {
  try {
    console.log('🎨 Ejecutando extracción y actualización de colores...');
    await ejecutarExtraccionColores();
    console.log('✅ Colores actualizados exitosamente!');
  } catch (error) {
    console.error('❌ Error actualizando colores:', error);
  }
}

main();
