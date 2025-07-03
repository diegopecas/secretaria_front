// update-scss-imports.js
// Script para actualizar los imports en archivos SCSS después de reorganizar las carpetas
// Ejecutar con: node update-scss-imports.js

const fs = require('fs');
const path = require('path');

// Archivos SCSS que necesitan actualización
const scssFiles = [
  // Componentes comunes (necesitan un nivel más ../)
  {
    file: 'src/app/components/common/notification/notification.component.scss',
    oldPath: '@use \'../../../styles/',
    newPath: '@use \'../../../../styles/'
  },
  {
    file: 'src/app/components/common/theme-toggle/theme-toggle.component.scss',
    oldPath: '@use \'../../../styles/',
    newPath: '@use \'../../../../styles/'
  },
  
  // Componentes de páginas (necesitan un nivel más ../)
  {
    file: 'src/app/components/pages/login/login.component.scss',
    oldPath: '@use \'../../../styles/',
    newPath: '@use \'../../../../styles/'
  },
  {
    file: 'src/app/components/pages/menu/menu.component.scss',
    oldPath: '@use \'../../../styles/',
    newPath: '@use \'../../../../styles/'
  },
  {
    file: 'src/app/components/pages/usuarios/usuarios.component.scss',
    oldPath: '@use \'../../../styles/',
    newPath: '@use \'../../../../styles/'
  },
  {
    file: 'src/app/components/pages/registro-diario/registro-diario.component.scss',
    oldPath: '@use \'../../../styles/',
    newPath: '@use \'../../../../styles/'
  }
];

function updateScssImports(fileInfo) {
  try {
    if (!fs.existsSync(fileInfo.file)) {
      console.log(`⚠️  Archivo no encontrado: ${fileInfo.file}`);
      return;
    }

    let content = fs.readFileSync(fileInfo.file, 'utf8');
    let originalContent = content;
    
    // Reemplazar las rutas de imports
    content = content.replace(new RegExp(fileInfo.oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fileInfo.newPath);
    
    // Solo escribir si hubo cambios
    if (content !== originalContent) {
      fs.writeFileSync(fileInfo.file, content, 'utf8');
      console.log(`✅ Actualizado: ${fileInfo.file}`);
    } else {
      console.log(`⏭️  Sin cambios: ${fileInfo.file}`);
    }
  } catch (error) {
    console.error(`❌ Error procesando ${fileInfo.file}:`, error.message);
  }
}

// Script principal
console.log('🎨 Iniciando actualización de imports SCSS...\n');

scssFiles.forEach(fileInfo => {
  updateScssImports(fileInfo);
});

console.log('\n✨ Actualización de imports SCSS completada!');
console.log('\n📝 Los archivos SCSS ahora deberían compilar correctamente.');