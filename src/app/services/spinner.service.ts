// spinner.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class SpinnerService {
    public isLoading = signal(false);
    private loadingCount = 0;

    constructor() {
    }

    show() {


        this.loadingCount++;

        if (this.loadingCount === 1) {
            this.isLoading.set(true);

        }


    }

    hide() {

        if (this.loadingCount > 0) {
            this.loadingCount--;
        }

        if (this.loadingCount === 0) {
            setTimeout(() => {
                if (this.loadingCount === 0) {
                    this.isLoading.set(false);
                }
            }, 300);
        }
    }

    // Reset para casos de error
    reset() {
        this.loadingCount = 0;
        this.isLoading.set(false);
    }
}