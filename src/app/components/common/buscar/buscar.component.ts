import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrl: './buscar.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BuscarComponent {
  @Output() buscar = new EventEmitter();

  public valor = null;

  enviar() {
    this.buscar.emit(this.valor);
  }
}
