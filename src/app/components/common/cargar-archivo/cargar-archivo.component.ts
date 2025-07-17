import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ArchivoConfig {
  archivo: File;
  almacenar: boolean;
  extraerTexto: boolean;
}

export interface ArchivoExistente {
  id: number;
  nombre_archivo: string;
  tipo_archivo_codigo?: string;
  tamanio_bytes: number;
  almacenar_archivo: boolean;
  extraer_texto: boolean;
}

interface ArchivoInterno {
  archivo: File;
  almacenar: boolean;
  extraerTexto: boolean;
  estado: 'nuevo' | 'guardado' | 'error';
  mensaje?: string;
}

// Tipo para el índice
type TipoArchivo = 'documento' | 'imagen' | 'video' | 'audio' | 'hoja_calculo' | 'presentacion' | 'otro';

@Component({
  selector: 'app-cargar-archivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cargar-archivo.component.html',
  styleUrls: ['./cargar-archivo.component.scss']
})
export class CargarArchivoComponent implements OnInit {
  @Input() tiposPermitidos: string[] = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'];
  @Input() tamanioMaximoMB: number = 10;
  @Input() maximoArchivos: number = 10;
  @Input() archivosExistentes: ArchivoExistente[] = [];
  @Input() modoEdicion: boolean = false;
  @Input() soloLectura: boolean = false;
  
  @Output() archivosConfigurados = new EventEmitter<ArchivoConfig[]>();
  @Output() archivoExistenteEliminado = new EventEmitter<number>();

  archivos: ArchivoInterno[] = [];
  dragOver = false;
  
  // Configuración por tipo de archivo con tipo correcto
  private configuracionPorTipo: Record<TipoArchivo, { almacenar: boolean; extraerTexto: boolean }> = {
    documento: { almacenar: true, extraerTexto: true },
    imagen: { almacenar: true, extraerTexto: false },
    video: { almacenar: true, extraerTexto: false },
    audio: { almacenar: true, extraerTexto: false },
    hoja_calculo: { almacenar: true, extraerTexto: true },
    presentacion: { almacenar: true, extraerTexto: true },
    otro: { almacenar: true, extraerTexto: false }
  };

  ngOnInit() {
    // Emitir archivos vacíos al inicio
    this.emitirArchivos();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;

    if (this.soloLectura) return;

    const files = event.dataTransfer?.files;
    if (files) {
      this.procesarArchivos(files);
    }
  }

  onFileSelected(event: Event) {
    if (this.soloLectura) return;

    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files) {
      this.procesarArchivos(files);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
    input.value = '';
  }

  private procesarArchivos(files: FileList) {
    const archivosArray = Array.from(files);
    
    // Validar cantidad máxima
    const espacioDisponible = this.maximoArchivos - this.archivos.length - this.archivosExistentes.length;
    if (espacioDisponible <= 0) {
      alert(`Máximo ${this.maximoArchivos} archivos permitidos`);
      return;
    }

    const archivosAProcesar = archivosArray.slice(0, espacioDisponible);

    for (const archivo of archivosAProcesar) {
      const validacion = this.validarArchivo(archivo);
      
      if (validacion.valido) {
        const tipoArchivo = this.determinarTipoArchivo(archivo.name);
        const config = this.configuracionPorTipo[tipoArchivo];
        
        this.archivos.push({
          archivo: archivo,
          almacenar: config.almacenar,
          extraerTexto: config.extraerTexto,
          estado: 'nuevo'
        });
      } else {
        this.archivos.push({
          archivo: archivo,
          almacenar: false,
          extraerTexto: false,
          estado: 'error',
          mensaje: validacion.mensaje
        });
      }
    }

    this.emitirArchivos();
  }

  private validarArchivo(archivo: File): { valido: boolean; mensaje?: string } {
    // Validar extensión
    const extension = this.obtenerExtension(archivo.name);
    if (!this.tiposPermitidos.includes(extension)) {
      return { 
        valido: false, 
        mensaje: `Tipo de archivo .${extension} no permitido` 
      };
    }

    // Validar tamaño
    const tamanioMB = archivo.size / (1024 * 1024);
    if (tamanioMB > this.tamanioMaximoMB) {
      return { 
        valido: false, 
        mensaje: `El archivo excede el tamaño máximo de ${this.tamanioMaximoMB}MB` 
      };
    }

    return { valido: true };
  }

  eliminarArchivo(index: number) {
    this.archivos.splice(index, 1);
    this.emitirArchivos();
  }

  eliminarArchivoExistente(archivo: ArchivoExistente) {
    if (this.soloLectura) return;
    
    if (confirm(`¿Está seguro de eliminar el archivo ${archivo.nombre_archivo}?`)) {
      this.archivoExistenteEliminado.emit(archivo.id);
    }
  }

  // Método público para que sea accesible desde el template
  emitirArchivos() {
    const archivosValidos = this.archivos
      .filter(a => a.estado !== 'error')
      .map(a => ({
        archivo: a.archivo,
        almacenar: a.almacenar,
        extraerTexto: a.extraerTexto
      }));
    
    this.archivosConfigurados.emit(archivosValidos);
  }

  private obtenerExtension(nombreArchivo: string): string {
    return nombreArchivo.split('.').pop()?.toLowerCase() || '';
  }

  private determinarTipoArchivo(nombreArchivo: string): TipoArchivo {
    const extension = this.obtenerExtension(nombreArchivo);
    
    const mapeo: Record<string, TipoArchivo> = {
      'pdf': 'documento', 'doc': 'documento', 'docx': 'documento', 'txt': 'documento',
      'jpg': 'imagen', 'jpeg': 'imagen', 'png': 'imagen', 'gif': 'imagen',
      'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio',
      'mp4': 'video', 'avi': 'video', 'mov': 'video',
      'xls': 'hoja_calculo', 'xlsx': 'hoja_calculo', 'csv': 'hoja_calculo',
      'ppt': 'presentacion', 'pptx': 'presentacion'
    };
    
    return mapeo[extension] || 'otro';
  }

  getIconoArchivo(nombreArchivo: string): string {
    const extension = this.obtenerExtension(nombreArchivo);
    
    const iconos: { [key: string]: string } = {
      'pdf': 'fa-file-pdf',
      'doc': 'fa-file-word', 'docx': 'fa-file-word',
      'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
      'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
      'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image',
      'mp3': 'fa-file-audio', 'wav': 'fa-file-audio',
      'mp4': 'fa-file-video', 'avi': 'fa-file-video',
      'zip': 'fa-file-archive', 'rar': 'fa-file-archive'
    };
    
    return iconos[extension] || 'fa-file';
  }

  getColorArchivo(nombreArchivo: string): string {
    const extension = this.obtenerExtension(nombreArchivo);
    
    const colores: { [key: string]: string } = {
      'pdf': '#e74c3c',
      'doc': '#3498db', 'docx': '#3498db',
      'xls': '#2ecc71', 'xlsx': '#2ecc71',
      'ppt': '#e67e22', 'pptx': '#e67e22',
      'jpg': '#9b59b6', 'jpeg': '#9b59b6', 'png': '#9b59b6',
      'mp3': '#1abc9c', 'wav': '#1abc9c',
      'mp4': '#e74c3c', 'avi': '#e74c3c',
      'zip': '#95a5a6', 'rar': '#95a5a6'
    };
    
    return colores[extension] || '#7f8c8d';
  }

  formatearTamanio(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get totalArchivos(): number {
    return this.archivos.length + this.archivosExistentes.length;
  }

  get puedeAgregarArchivos(): boolean {
    return !this.soloLectura && this.totalArchivos < this.maximoArchivos;
  }

  get tiposPermitidosString(): string {
    return this.tiposPermitidos.map(t => `.${t}`).join(', ');
  }

  get acceptString(): string {
    return this.tiposPermitidos.map(ext => {
      const mimeTypes: { [key: string]: string } = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
      };
      return mimeTypes[ext] || `.${ext}`;
    }).join(', ');
  }
}