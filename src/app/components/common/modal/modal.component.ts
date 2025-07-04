import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  @Input() title: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showFooter: boolean = true;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

  @HostListener('click', ['$event'])
  onModalClick(event: MouseEvent) {
    // Si se hace clic en el backdrop (fuera del modal), cerrar
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeModal();
  }
}