// src/app/components/common/spinner/spinner.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerService } from '../../../services/spinner.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="spinner-overlay" *ngIf="spinnerService.isLoading()">
      <div class="spinner-container">
        <div class="spinner-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p class="spinner-text">Cargando...</p>
      </div>
    </div>
  `,
  styles: [`
    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .spinner-container {
      text-align: center;
    }

    .spinner-ring {
      display: inline-block;
      position: relative;
      width: 80px;
      height: 80px;
    }

    .spinner-ring div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 64px;
      height: 64px;
      margin: 8px;
      border: 8px solid #ffd700;
      border-radius: 50%;
      animation: spinner-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-color: #ffd700 transparent transparent transparent;
    }

    .spinner-ring div:nth-child(1) {
      animation-delay: -0.45s;
    }

    .spinner-ring div:nth-child(2) {
      animation-delay: -0.3s;
    }

    .spinner-ring div:nth-child(3) {
      animation-delay: -0.15s;
    }

    @keyframes spinner-ring {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .spinner-text {
      color: white;
      margin-top: 20px;
      font-size: 1.1rem;
    }
  `]
})
export class SpinnerComponent implements OnInit {
  constructor(public spinnerService: SpinnerService) {
    
  }

  ngOnInit() {
    // Monitor de cambios para debug
    let lastValue = false;
    setInterval(() => {
      const currentValue = this.spinnerService.isLoading();
      if (currentValue !== lastValue) {
        lastValue = currentValue;
      }
    }, 100);
  }
}