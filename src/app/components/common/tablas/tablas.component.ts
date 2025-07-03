import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import Swal from 'sweetalert2';
import { BuscarComponent } from '../../common/buscar/buscar.component';
import { SearchPipeGeneral } from '../../../pipes/search.pipe';
import { CustomDecimalFormatPipe } from '../../../pipes/custom-decimal-format.pipe';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tablas',
  templateUrl: './tablas.component.html',
  styleUrl: './tablas.component.scss',
  standalone: true,
  imports: [CommonModule, BuscarComponent, CustomDecimalFormatPipe, RouterModule, FormsModule, NgClass],
  providers: [SearchPipeGeneral]
})
export class TablasComponent implements OnChanges {
  @Input() titulos: any[] = [];
  @Input() datos: any[] = [];
  @Input() acciones: any[] = []; // [{ id: '', label: '', icono: '' }]
  @Input() raiz: any = "";
  @Input() accionVer: any = false;
  @Input() accionEditar: any = false;
  @Input() accionEliminar: any = false;
  @Input() mostrarBuscar: any = false;
  @Input() columnasFiltro: string[] = []; // Columnas que tendrán filtros
  @Output() eliminar = new EventEmitter<any>();
  @Output() clicAccion = new EventEmitter<any>();

  // Estructura para documentar los formatos disponibles
  public formatosDisponibles = {
    // Tipos de formato existentes
    number: { alias: 'number', descripcion: 'Formato numérico (ej: 1,234.56)' },
    integer: { alias: 'integer', descripcion: 'Formato entero (ej: 1,234)' },
    percent: { alias: 'percent', descripcion: 'Porcentaje (ej: 12.34%)' },
    currency: { alias: 'currency', descripcion: 'Moneda (similar a money)' },
    money: { alias: 'money', descripcion: 'Moneda (ej: $ 1,234.56)' },
    date: { alias: 'date', descripcion: 'Fecha (ej: 01/01/2023)' },
    datetime: { alias: 'datetime', descripcion: 'Fecha y hora (ej: 01/01/2023 12:34)' },
    time: { alias: 'time', descripcion: 'Hora (ej: 12:34)' },
    link: { alias: 'link', descripcion: 'Enlace' },

    // Nuevos tipos agregados
    badge: {
      alias: 'badge',
      descripcion: 'Etiqueta con estilo (badge). Usa claseCSS para el estilo'
    },
    progreso: {
      alias: 'progreso',
      descripcion: 'Barra de progreso. El valor debe ser un porcentaje (0-100)'
    },
    html: {
      alias: 'html',
      descripcion: 'Contenido HTML puro. Úsalo con precaución'
    },
    icono: {
      alias: 'icono',
      descripcion: 'Icono con texto opcional. Usa clave_class, clave_color, clave_title'
    },
    booleano: {
      alias: 'booleano',
      descripcion: 'Muestra check o X para valores true/false o 1/0'
    }
  };
  // Parámetros de formato
  formatConfig: { [key: string]: any } = {};

  public path = ""
  public buscarTexto = "";
  public accionVerActivo = false;
  public accionEditarActivo = false;
  public accionEliminarActivo = false;
  public buscador = true;
  public registrosPagina = 10;

  // Estructura para manejar filtros estilo Excel
  public filtrosActivos: { [key: string]: any[] } = {}; // Ahora es un array por cada columna
  public opcionesFiltro: { [key: string]: { valor: any, seleccionado: boolean }[] } = {};

  // Estado de los dropdowns de filtro
  public filtroAbierto: { [key: string]: boolean } = {};
  public todosSeleccionados: { [key: string]: boolean } = {};

  // Contador de filtros activos
  public cantidadFiltrosActivos: number = 0;

  // Nuevo estado para manejar el menú desplegable de acciones
  public accionesMenuAbierto: { [key: string]: boolean } = {};

  // Propiedad calculada para verificar si hay acciones
  get tieneAcciones(): boolean {
    return this.accionVerActivo || this.accionEditarActivo || this.accionEliminarActivo || (this.tabla.acciones && this.tabla.acciones.length > 0);
  }

  public tabla: any = {
    columnas: 0,
    titulos: [],
    datos: [],
    datosFiltrados: [],
    acciones: [],
    paginas: [[]],
    paginaActual: 0
  }
  public busquedaFiltro: { [key: string]: string } = {};
  public opcionesFiltroFiltradas: { [key: string]: { valor: any, seleccionado: boolean }[] } = {};

  // Instancia del pipe para búsqueda
  private searchPipe = new SearchPipeGeneral();

  constructor() { }

  // Método para dar formato a valores según el tipo
  formatValue(valor: any, tipo: string | undefined, formato?: any): string {
    if (valor === undefined || valor === null || valor === '') {
      return '';
    }

    // Función para formatear números usando Intl.NumberFormat
    const formatNumber = (num: number, minFraction: number = 0, maxFraction: number = 2): string => {
      if (isNaN(num)) {
        return String(valor);
      }
      return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction
      }).format(num);
    };

    // Función corregida para formatear fechas
    const formatDate = (dateStr: any, options: any): string => {
      try {
        // Si no es string o número, retornar el valor tal cual
        if (typeof dateStr !== 'string' && typeof dateStr !== 'number') {
          return String(dateStr);
        }

        let date: Date;

        // Si es una fecha ISO (YYYY-MM-DD)
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          // Asegurarnos que interpretamos la fecha en UTC para evitar problemas de zona horaria
          date = new Date(dateStr + 'T00:00:00Z');
        } else {
          date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
          // Si no es una fecha válida, retornar el valor original
          return String(dateStr);
        }

        // Usar el formateador de Intl
        return new Intl.DateTimeFormat('es-ES', options).format(date);
      } catch (e) {
        // En caso de error, retornar el valor original sin loguear error
        return String(dateStr);
      }
    };

    switch (tipo) {
      case 'date':
        try {
          // Si es una fecha ISO (YYYY-MM-DD)
          if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
            // Extraer partes de la fecha (evitando problemas de zona horaria)
            const [year, month, day] = valor.split('-').map(n => parseInt(n, 10));

            // Construir la fecha manualmente con el formato español (DD/MM/YYYY)
            return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
          }

          return formatDate(valor, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        } catch {
          return valor;
        }

      case 'datetime':
        try {
          return formatDate(valor, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return valor;
        }

      case 'time':
        try {
          return formatDate(valor, {
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return valor;
        }

      case 'number':
        const numValue = parseFloat(valor);
        if (isNaN(numValue)) return String(valor);
        const numOptions = formato?.digitInfo?.split('-') || ['1', '2', '2'];
        const minFrac = parseInt(numOptions[1] || '0');
        const maxFrac = parseInt(numOptions[2] || '2');
        return formatNumber(numValue, minFrac, maxFrac);

      case 'integer':
        const intValue = parseInt(valor);
        if (isNaN(intValue)) return String(valor);
        return formatNumber(intValue, 0, 0);

      case 'percent':
        let percentValue = parseFloat(valor);
        if (isNaN(percentValue)) return String(valor);
        // Si el valor ya está en formato decimal (ej. 0.25 para 25%)
        if (formato?.asDecimal && percentValue <= 1) {
          percentValue = percentValue * 100;
        }
        return formatNumber(percentValue,
          formato?.digitInfo ? parseInt(formato.digitInfo.split('-')[1] || '0') : 0,
          formato?.digitInfo ? parseInt(formato.digitInfo.split('-')[2] || '2') : 2) + '%';

      case 'currency':
        const currValue = parseFloat(valor);
        if (isNaN(currValue)) return String(valor);
        return '$ ' + formatNumber(currValue, 2, 2);

      default:
        return valor.toString();
    }
  }

  // Inicializar en el constructor o en ngOnInit
  initFiltrosBusqueda() {
    Object.keys(this.opcionesFiltro).forEach(clave => {
      this.busquedaFiltro[clave] = '';
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
    });
  }

  // Método para filtrar opciones según la búsqueda
  filtrarOpciones(clave: string) {
    const busqueda = this.busquedaFiltro[clave].toLowerCase();

    if (!busqueda) {
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
      return;
    }

    this.opcionesFiltroFiltradas[clave] = this.opcionesFiltro[clave].filter(opcion => {
      const valor = opcion.valor?.toString().toLowerCase() || '';
      return valor.includes(busqueda);
    });
  }

  // Método para obtener el índice original de una opción filtrada
  getOpcionOriginalIndex(clave: string, opcionFiltrada: any): number {
    return this.opcionesFiltro[clave].findIndex(opt => opt.valor === opcionFiltrada.valor);
  }

  // Método para contar opciones seleccionadas
  contarSeleccionados(clave: string): number {
    return this.opcionesFiltro[clave].filter(opt => opt.seleccionado).length;
  }

  // Modificar toggleFiltro para resetear la búsqueda al abrir el filtro
  toggleFiltro(clave: string) {
    this.filtroAbierto[clave] = !this.filtroAbierto[clave];

    if (this.filtroAbierto[clave]) {
      // Reset la búsqueda cuando se abre
      this.busquedaFiltro[clave] = '';
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
    }
  }

  // Nuevo método para controlar el menú desplegable de acciones
  toggleAccionesMenu(id: string) {
    // Cerrar todos los demás menús primero
    Object.keys(this.accionesMenuAbierto).forEach(key => {
      if (key !== id) {
        this.accionesMenuAbierto[key] = false;
      }
    });

    // Toggle del menú actual
    this.accionesMenuAbierto[id] = !this.accionesMenuAbierto[id];
  }

  // Integrar con clickOutside (opcional)
  @HostListener('document:click', ['$event'])
  clickOutside(event: any) {
    // Para dropdowns de filtro
    const clickedInsideDropdown = event.target.closest('.dropdown-menu');
    const clickedOnToggle = event.target.closest('.dropdown-toggle');

    // Si no se hizo clic en un menú desplegable ni en un botón de alternancia, cerrar todos
    if (!clickedInsideDropdown && !clickedOnToggle) {
      this.cerrarTodosLosDropdowns();
      this.cerrarTodosLosMenusAcciones();
    }
  }

  // Cerrar todos los menús de acciones
  cerrarTodosLosMenusAcciones() {
    Object.keys(this.accionesMenuAbierto).forEach(key => {
      this.accionesMenuAbierto[key] = false;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('TablasComponent - ngOnChanges', changes);

    if (changes["raiz"]) {
      this.path = changes["raiz"]["currentValue"];
    }
    if (changes["acciones"]) {
      this.tabla.acciones = changes["acciones"]["currentValue"] || [];
    }
    if (changes["titulos"]) {
      this.tabla.titulos = changes["titulos"]["currentValue"] || [];

      // Configurar los formatos para cada columna si tienen opciones de formato
      this.tabla.titulos.forEach((titulo: any) => {
        if (titulo.formato) {
          this.formatConfig[titulo.clave] = titulo.formato;
        }
      });
    }
    if (changes["datos"]) {
      console.log('TablasComponent - Datos cambiados:', changes["datos"]["currentValue"]);
      this.tabla.datos = Array.isArray(changes["datos"]["currentValue"]) ?
        changes["datos"]["currentValue"] : [];

      // Generar opciones de filtro cuando los datos cambian
      this.generarOpcionesFiltro();
      this.filtrarDatos();
    }
    if (changes["accionVer"]) {
      this.accionVerActivo = changes["accionVer"]["currentValue"] || false;
    }
    if (changes["accionEditar"]) {
      this.accionEditarActivo = changes["accionEditar"]["currentValue"] || false;
    }
    if (changes["accionEliminar"]) {
      this.accionEliminarActivo = changes["accionEliminar"]["currentValue"] || false;
    }
    if (changes["mostrarBuscar"]) {
      this.buscador = changes["mostrarBuscar"]["currentValue"] || false;
    }
    if (changes["columnasFiltro"]) {
      // Inicializar opciones de filtro cuando columnasFiltro cambia
      this.columnasFiltro = Array.isArray(changes["columnasFiltro"]["currentValue"]) ?
        changes["columnasFiltro"]["currentValue"] : [];
      // Resetear filtros
      this.resetFiltros();
      if (this.tabla.datos && this.tabla.datos.length > 0) {
        this.generarOpcionesFiltro();
      }
    }
    this.calcularColumnas();
  }

  // Genera las opciones de filtro para cada columna
  generarOpcionesFiltro() {
    if (!this.tabla.datos || !Array.isArray(this.tabla.datos) || this.tabla.datos.length === 0 ||
      !this.columnasFiltro || !Array.isArray(this.columnasFiltro) || this.columnasFiltro.length === 0) {
      return;
    }

    this.opcionesFiltro = {};

    // Para cada columna de filtro
    this.columnasFiltro.forEach(columnaAlias => {
      // Buscar la clave correspondiente al alias
      const tituloItem = this.tabla.titulos.find((t: any) => t.alias === columnaAlias);

      if (tituloItem) {
        const clave = tituloItem.clave;

        // Obtener valores únicos
        const valoresSet = new Set();
        this.tabla.datos.forEach((item: any) => {
          if (item[clave] !== undefined && item[clave] !== null) {
            valoresSet.add(item[clave]);
          }
        });

        // Convertir a array y ordenar
        const valoresArray = Array.from(valoresSet);
        valoresArray.sort((a: any, b: any) => {
          if (typeof a === 'string' && typeof b === 'string') {
            return a.localeCompare(b);
          }
          return a - b;
        });

        // Guardar opciones como objetos con estado de selección
        this.opcionesFiltro[clave] = valoresArray.map(valor => ({
          valor: valor,
          seleccionado: true // Por defecto todas las opciones seleccionadas
        }));

        // Inicializar estado del dropdown y selección
        this.filtroAbierto[clave] = false;
        this.todosSeleccionados[clave] = true;

        // Inicializar filtros activos para esta columna si no existe
        if (!this.filtrosActivos[clave]) {
          this.filtrosActivos[clave] = valoresArray;
        }
      }
    });
    this.actualizarContadorFiltros();
    this.initFiltrosBusqueda();
  }

  // Selecciona/deselecciona todas las opciones de una columna
  toggleTodos(clave: string) {
    this.todosSeleccionados[clave] = !this.todosSeleccionados[clave];

    this.opcionesFiltro[clave].forEach(opcion => {
      opcion.seleccionado = this.todosSeleccionados[clave];
    });

    this.aplicarSeleccion(clave);
  }

  // Maneja el cambio en un checkbox individual
  toggleOpcion(clave: string, index: number) {
    if (index >= 0 && index < this.opcionesFiltro[clave].length) {
      this.opcionesFiltro[clave][index].seleccionado = !this.opcionesFiltro[clave][index].seleccionado;

      // Verificar si todas están seleccionadas
      this.todosSeleccionados[clave] = this.opcionesFiltro[clave].every(opcion => opcion.seleccionado);

      this.aplicarSeleccion(clave);
    }
  }

  // Aplica los valores seleccionados al filtro
  aplicarSeleccion(clave: string) {
    const valoresSeleccionados = this.opcionesFiltro[clave]
      .filter(opcion => opcion.seleccionado)
      .map(opcion => opcion.valor);

    this.filtrosActivos[clave] = valoresSeleccionados;
    this.filtrarDatos();
    this.actualizarContadorFiltros();
  }

  // Actualiza el contador de filtros activos
  actualizarContadorFiltros() {
    let contador = 0;

    Object.keys(this.filtrosActivos).forEach(clave => {
      if (this.opcionesFiltro[clave] && this.filtrosActivos[clave].length < this.opcionesFiltro[clave].length) {
        contador++;
      }
    });

    this.cantidadFiltrosActivos = contador;
  }

  // Resetea todos los filtros
  resetFiltros() {
    this.filtrosActivos = {};

    Object.keys(this.opcionesFiltro).forEach(clave => {
      if (this.opcionesFiltro[clave]) {
        // Seleccionar todas las opciones de nuevo
        this.opcionesFiltro[clave].forEach(opcion => {
          opcion.seleccionado = true;
        });

        this.todosSeleccionados[clave] = true;
        this.filtrosActivos[clave] = this.opcionesFiltro[clave].map(opcion => opcion.valor);
      }
    });

    this.filtrarDatos();
    this.cantidadFiltrosActivos = 0;
  }

  cambiarTamanoPagina(tamano: number) {
    this.registrosPagina = tamano;
    this.filtrarDatos();
  }

  cambiarPaginaActual(i: number) {
    if (i >= 0 && i < this.tabla.paginas.length) {
      this.tabla.paginaActual = i;
    }
  }

  calcularColumnas() {
    // Ahora solo necesitamos 1 columna para el menú desplegable de acciones si hay alguna acción
    this.tabla.columnas = this.tieneAcciones ? 1 : 0;
  }

  eliminarRegistro(valor: any) {
    Swal.fire({
      title: "¿Está seguro de borrar el registro " + valor + "?",
      text: "Esta acción no se puede revertir!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, borrarlo!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminar.emit(valor);
      }
    });
  }

  buscar(event: any) {
    this.buscarTexto = event;
    this.filtrarDatos();
  }

  // Método mejorado para filtrar datos - SIN COLLECT.JS
  filtrarDatos() {
    console.log('TablasComponent - filtrarDatos', {
      datos: this.tabla.datos?.length || 0,
      busqueda: this.buscarTexto,
      filtrosActivos: Object.keys(this.filtrosActivos).length
    });

    // Si no hay datos en absoluto, inicializar con página vacía y salir
    if (!this.tabla.datos || !Array.isArray(this.tabla.datos) || this.tabla.datos.length === 0) {
      this.tabla.datosFiltrados = [];
      this.tabla.paginas = [[]];
      this.tabla.paginaActual = 0;
      console.log('TablasComponent - No hay datos para filtrar');
      return;
    }

    // Primero aplicar la búsqueda de texto
    let datosFiltrados = this.searchPipe.transform(this.tabla.datos, this.buscarTexto);
    console.log('TablasComponent - Después de búsqueda:', datosFiltrados.length);

    // Luego aplicar los filtros de selección múltiple
    if (Object.keys(this.filtrosActivos).length > 0) {
      datosFiltrados = datosFiltrados.filter((item: any) => {
        return Object.keys(this.filtrosActivos).every(columna => {
          // Si no hay filtros activos para esta columna o está vacío, considerar como coincidencia
          if (!this.filtrosActivos[columna] || this.filtrosActivos[columna].length === 0) {
            return true;
          }
          // Verificar si el valor del ítem está en la lista de valores seleccionados
          return this.filtrosActivos[columna].includes(item[columna]);
        });
      });
      console.log('TablasComponent - Después de filtros:', datosFiltrados.length);
    }

    this.tabla.datosFiltrados = datosFiltrados;

    // Crear la paginación sin collect.js
    if (this.registrosPagina <= 0) this.registrosPagina = 10; // Evitar división por cero

    try {
      // Función para dividir array en chunks
      const chunk = (array: any[], size: number): any[][] => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };

      const chunks = chunk(this.tabla.datosFiltrados, this.registrosPagina);
      this.tabla.paginas = chunks.length > 0 ? chunks : [[]];

      // Asegurar que la página actual esté dentro del rango válido
      if (this.tabla.paginaActual >= this.tabla.paginas.length) {
        this.tabla.paginaActual = Math.max(0, this.tabla.paginas.length - 1);
      }
    } catch (error) {
      console.error('Error al paginar los datos:', error);
      this.tabla.paginas = [[]]; // En caso de error, al menos tener una página vacía
      this.tabla.paginaActual = 0;
    }

    console.log('TablasComponent - Resultados finales:', {
      datosFiltrados: this.tabla.datosFiltrados.length,
      paginas: this.tabla.paginas.length,
      paginaActual: this.tabla.paginaActual
    });
  }

  seleccionar(accion: any, id: any, registro: any) {
    // Cerrar el menú de acciones después de seleccionar una acción
    this.cerrarTodosLosMenusAcciones();

    this.clicAccion.emit({
      accion: accion,
      id: id,
      registro: registro
    });
  }

  // Cierra todos los dropdowns de filtros
  cerrarTodosLosDropdowns() {
    Object.keys(this.filtroAbierto).forEach(clave => {
      this.filtroAbierto[clave] = false;
    });
  }

  // Cierra los demás dropdowns excepto el actual
  cerrarOtrosDropdowns(claveActual: string) {
    Object.keys(this.filtroAbierto).forEach(clave => {
      if (clave !== claveActual) {
        this.filtroAbierto[clave] = false;
      }
    });
  }
}