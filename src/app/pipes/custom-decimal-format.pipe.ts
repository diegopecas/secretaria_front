// number-format.pipe.ts

import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "customDecimalFormat",
  standalone: true
})
export class CustomDecimalFormatPipe implements PipeTransform {
  transform(value: number, decimalPlaces: number = 2): string {
    // Verificar si el valor es un número
    if (isNaN(value)) {
      return value.toString();
    }

    if (decimalPlaces == 0) {
      const formattedValue = value
        .toFixed(decimalPlaces)
        .replace(/\B(?=(\d{3})+(?!\d))/g, "$&,");
      return formattedValue
        .replaceAll(",", ";")
        .replaceAll(".", ",")
        .replaceAll(";", ".");
    } else {
      const formattedValue = value
        .toFixed(decimalPlaces)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,");
      return formattedValue
        .replaceAll(",", ";")
        .replaceAll(".", ",")
        .replaceAll(";", ".");
    }
  }
}
/*export class CustomDecimalFormatPipe implements PipeTransform {
  transform(value: number, decimal: number): string {
    // Verificar si el valor es un número
    if (isNaN(value)) {
      return value.toString();
    }

    // Convertir el número a formato con separadores de miles y decimales
    const formattedValue = value
      .toFixed(decimal)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");
    // Reemplazar el punto decimal por la coma
    return formattedValue
      .replaceAll(",", ";")
      .replaceAll(".", ",")
      .replaceAll(";", ".");
  }
}*/
