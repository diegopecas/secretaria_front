// update-imports.js
// Script para actualizar los imports después de reorganizar las carpetas
// Ejecutar con: node update-imports.js

const fs = require('fs');
const path = require('path');

// Mapeo de cambios de rutas
const importMappings = [
  // Componentes de páginas
  { 
    from: /from ['"]\.\/components\/login\//g,
    to: "from './components/pages/login/"
  },
  { 
    from: /from ['"]\.\/components\/menu\//g,
    to: "from './components/pages/menu/"
  },
  { 
    from: /from ['"]\.\/components\/usuarios\//g,
    to: "from './components/pages/usuarios/"
  },
  { 
    from: /from ['"]\.\/components\/registro-diario\//g,
    to: "from './components/pages/registro-diario/"
  },
  
  // Componentes comunes - desde páginas
  { 
    from: /from ['"]\.\.\/layout\//g,
    to: "from '../../common/layout/"
  },
  { 
    from: /from ['"]\.\.\/tablas\//g,
    to: "from '../../common/tablas/"
  },
  { 
    from: /from ['"]\.\.\/buscar\//g,
    to: "from '../../common/buscar/"
  },
  { 
    from: /from ['"]\.\.\/theme-toggle\//g,
    to: "from '../../common/theme-toggle/"
  },
  { 
    from: /from ['"]\.\.\/notification\//g,
    to: "from '../../common/notification/"
  },
  
  // Componentes comunes - desde app.component
  { 
    from: /from ['"]\.\/components\/notification\//g,
    to: "from './components/common/notification/"
  },
  
  // Pipes - desde componentes comunes (ahora necesitan un nivel más)
  { 
    from: /from ['"]\.\.\/\.\.\/pipes\//g,
    to: "from '../../../pipes/"
  },
  
  // Servicios - desde componentes comunes (ahora necesitan un nivel más)
  { 
    from: /from ['"]\.\.\/\.\.\/services\//g,
    to: "from '../../../services/"
  },
  
  // Directivas - desde componentes comunes (ahora necesitan un nivel más)
  { 
    from: /from ['"]\.\.\/\.\.\/directives\//g,
    to: "from '../../../directives/"
  }
];

// Archivos específicos que necesitan actualización
const filesToUpdate = [
  // Archivo principal
  'src/app/app.component.ts',
  'src/app/app.routes.ts',
  
  // Componentes de páginas
  'src/app/components/pages/login/login.component.ts',
  'src/app/components/pages/menu/menu.component.ts',
  'src/app/components/pages/usuarios/usuarios.component.ts',
  'src/app/components/pages/registro-diario/registro-diario.component.ts',
  
  // Componentes comunes
  'src/app/components/common/layout/layout.component.ts',
  'src/app/components/common/tablas/tablas.component.ts',
  'src/app/components/common/buscar/buscar.component.ts',
  'src/app/components/common/theme-toggle/theme-toggle.component.ts',
  'src/app/components/common/notification/notification.component.ts'
];

function updateImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = [];
    
    // Aplicar todos los mappings
    importMappings.forEach(mapping => {
      const matches = content.match(mapping.from);
      if (matches) {
        content = content.replace(mapping.from, mapping.to);
        changes.push(`  - ${matches[0]} → ${mapping.to}`);
      }
    });
    
    // Solo escribir si hubo cambios
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
      if (changes.length > 0) {
        console.log('   Cambios:');
        changes.forEach(change => console.log(change));
      }
    } else {
      console.log(`⏭️  Sin cambios: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

// Script principal
console.log('🚀 Iniciando actualización de imports...\n');

// Verificar que los archivos existan antes de procesarlos
filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    updateImports(file);
  } else {
    console.log(`⚠️  Archivo no encontrado: ${file}`);
  }
});

console.log('\n✨ Actualización de imports completada!');
console.log('\n📝 Recuerda:');
console.log('1. Ejecutar los comandos de movimiento de carpetas primero');
console.log('2. Verificar que todos los componentes funcionen correctamente');
console.log('3. Ejecutar ng build para asegurarte de que no hay errores');