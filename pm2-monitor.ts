#!/usr/bin/env bun

/**
 * Monitor de PM2 para el scraper de Fortnite
 * Este script monitorea el estado del scraper y reinicia si es necesario
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PM2Process {
  name: string;
  pid: number;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restart: number;
}

class PM2Monitor {
  private processName: string;
  private maxRestarts: number = 5;
  private restartCount: number = 0;
  private lastRestart: number = 0;
  private restartCooldown: number = 300000; // 5 minutos

  constructor(processName: string = 'bun run') {
    this.processName = processName;
  }

  async getPM2Status(): Promise<PM2Process[]> {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      return processes.filter((p: any) => p.name.includes(this.processName));
    } catch (error) {
      console.error('❌ Error obteniendo estado de PM2:', error);
      return [];
    }
  }

  async restartProcess(): Promise<boolean> {
    const now = Date.now();
    
    // Verificar cooldown
    if (now - this.lastRestart < this.restartCooldown) {
      console.log('⏳ Cooldown activo, esperando antes del siguiente reinicio...');
      return false;
    }

    // Verificar límite de reinicios
    if (this.restartCount >= this.maxRestarts) {
      console.error(`❌ Límite de reinicios alcanzado (${this.maxRestarts})`);
      return false;
    }

    try {
      console.log('🔄 Reiniciando proceso...');
      await execAsync('pm2 restart all');
      this.restartCount++;
      this.lastRestart = now;
      console.log(`✅ Proceso reiniciado (${this.restartCount}/${this.maxRestarts})`);
      return true;
    } catch (error) {
      console.error('❌ Error reiniciando proceso:', error);
      return false;
    }
  }

  async checkProcessHealth(): Promise<boolean> {
    const processes = await this.getPM2Status();
    
    if (processes.length === 0) {
      console.log('⚠️ No se encontraron procesos de PM2');
      return false;
    }

    for (const process of processes) {
      console.log(`📊 Proceso: ${process.name}`);
      console.log(`   - PID: ${process.pid}`);
      console.log(`   - Estado: ${process.status}`);
      console.log(`   - CPU: ${process.cpu}%`);
      console.log(`   - Memoria: ${process.memory}MB`);
      console.log(`   - Uptime: ${process.uptime}s`);
      console.log(`   - Reinicios: ${process.restart}`);

      // Verificar si el proceso está funcionando correctamente
      if (process.status !== 'online') {
        console.log(`⚠️ Proceso ${process.name} no está online (${process.status})`);
        return false;
      }

      // Verificar uso excesivo de memoria
      if (process.memory > 1000) { // Más de 1GB
        console.log(`⚠️ Uso excesivo de memoria: ${process.memory}MB`);
        return false;
      }

      // Verificar si ha tenido muchos reinicios
      if (process.restart > 10) {
        console.log(`⚠️ Demasiados reinicios: ${process.restart}`);
        return false;
      }
    }

    return true;
  }

  async monitor(): Promise<void> {
    console.log('🔍 Iniciando monitoreo de PM2...');
    console.log(`📋 Proceso objetivo: ${this.processName}`);
    console.log(`🔄 Máximo reinicios: ${this.maxRestarts}`);
    console.log(`⏰ Cooldown: ${this.restartCooldown / 1000}s\n`);

    setInterval(async () => {
      console.log(`\n⏰ ${new Date().toLocaleString()} - Verificando estado...`);
      
      const isHealthy = await this.checkProcessHealth();
      
      if (!isHealthy) {
        console.log('⚠️ Proceso no saludable detectado');
        const restarted = await this.restartProcess();
        
        if (!restarted) {
          console.log('❌ No se pudo reiniciar el proceso');
        }
      } else {
        console.log('✅ Proceso funcionando correctamente');
        // Resetear contador de reinicios si todo está bien
        this.restartCount = Math.max(0, this.restartCount - 1);
      }
      
    }, 60000); // Verificar cada minuto
  }

  async getLogs(lines: number = 50): Promise<void> {
    try {
      console.log(`📋 Últimas ${lines} líneas de logs:`);
      const { stdout } = await execAsync(`pm2 logs --lines ${lines}`);
      console.log(stdout);
    } catch (error) {
      console.error('❌ Error obteniendo logs:', error);
    }
  }

  async flushLogs(): Promise<void> {
    try {
      console.log('🗑️ Limpiando logs de PM2...');
      await execAsync('pm2 flush');
      console.log('✅ Logs limpiados');
    } catch (error) {
      console.error('❌ Error limpiando logs:', error);
    }
  }
}

// Función principal
async function main() {
  const monitor = new PM2Monitor('bun run');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--logs')) {
    await monitor.getLogs(100);
  } else if (args.includes('--flush')) {
    await monitor.flushLogs();
  } else if (args.includes('--status')) {
    await monitor.checkProcessHealth();
  } else {
    await monitor.monitor();
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  main().catch(console.error);
}

export { PM2Monitor };
