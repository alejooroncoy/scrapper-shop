// Configuración de cookies para evitar verificación de seguridad de Epic Games
// Actualizar estos valores cuando las cookies expiren

export const FORTNITE_COOKIES = [
  {
    name: 'cf_clearance',
    value: 'rjGgwkPXxjpMf5lyVOkiKZPwRz3w',
    domain: '.fortnite.com',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 año
    httpOnly: true,
    secure: true,
    sameSite: 'None' as const
  },
  {
    name: '_epicSID',
    value: '971f849dae4147c4a00126b4ec629b48',
    domain: '.fortnite.com',
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'None' as const
  },
  {
    name: '_cf_bm',
    value: 'yLHBt7Mc2yzb.BcslbeLxih7pm_3RAb...e3LBk-1758040886-1',
    domain: '.fortnite.com',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 horas
    httpOnly: true,
    secure: true,
    sameSite: 'None' as const
  }
];

// Función para actualizar cookies desde el navegador
export function updateCookiesFromBrowser() {
  console.log('🍪 Para actualizar las cookies:');
  console.log('1. Abre https://www.fortnite.com/item-shop en tu navegador');
  console.log('2. Abre las herramientas de desarrollador (F12)');
  console.log('3. Ve a la pestaña "Almacenamiento" o "Storage"');
  console.log('4. Copia los valores de las cookies:');
  console.log('   - cf_clearance');
  console.log('   - _epicSID');
  console.log('   - _cf_bm');
  console.log('5. Actualiza los valores en este archivo');
  console.log('6. Reinicia el servidor');
}
