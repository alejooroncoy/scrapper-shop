#!/usr/bin/env bun
// Script para probar los proxies configurados

import { 
  displayProxyInfo, 
  testAllProxies, 
  testProxy, 
  getRandomProxy,
  getAllProxies 
} from './proxy-config';

async function main() {
  console.log('🚀 Iniciando pruebas de proxies...\n');
  
  // Mostrar información de los proxies
  displayProxyInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Preguntar qué hacer
  const args = process.argv.slice(2);
  
  if (args.includes('--all') || args.includes('-a')) {
    // Probar todos los proxies
    await testAllProxies();
  } else if (args.includes('--random') || args.includes('-r')) {
    // Probar un proxy aleatorio
    const randomProxy = getRandomProxy();
    console.log('🎲 Probando proxy aleatorio...\n');
    const index = getAllProxies().indexOf(randomProxy);
    await testProxy(index);
  } else if (args.includes('--index') || args.includes('-i')) {
    // Probar un proxy específico por índice
    const indexArg = args.find(arg => arg.startsWith('--index=') || arg.startsWith('-i='));
    if (indexArg) {
      const index = parseInt(indexArg.split('=')[1]) - 1; // Convertir a índice base 0
      if (index >= 0 && index < getAllProxies().length) {
        await testProxy(index);
      } else {
        console.log('❌ Índice inválido. Usa un número entre 1 y', getAllProxies().length);
      }
    } else {
      console.log('❌ Debes especificar un índice. Ejemplo: --index=1 o -i=1');
    }
  } else {
    // Mostrar ayuda
    console.log('📖 Uso del script:');
    console.log('  bun test-proxies.ts --all          # Probar todos los proxies');
    console.log('  bun test-proxies.ts --random       # Probar un proxy aleatorio');
    console.log('  bun test-proxies.ts --index=1      # Probar proxy específico (1-10)');
    console.log('  bun test-proxies.ts -a             # Alias para --all');
    console.log('  bun test-proxies.ts -r             # Alias para --random');
    console.log('  bun test-proxies.ts -i=1           # Alias para --index=1');
    console.log('\n💡 Ejemplos:');
    console.log('  bun test-proxies.ts --all');
    console.log('  bun test-proxies.ts --index=3');
    console.log('  bun test-proxies.ts --random');
  }
}

// Ejecutar si se llama directamente
if (import.meta.main) {
  main().catch(console.error);
}
