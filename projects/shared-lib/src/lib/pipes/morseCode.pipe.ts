import {Pipe, PipeTransform} from '@angular/core';
@Pipe({
  name: 'morseCode',
})
export class MorseCodePipe implements PipeTransform {
  transform(value: string): string {
    let newVal = value.split("").map(char => 
      {
        let encoded = [];
        let ch = char.toUpperCase();
        if("AEFHIJLPRSUVW12345".includes(ch)){
          encoded.push(".");
        }else if("BCDGKMNOQTXYZ67890".includes(ch)){
          encoded.push("-");
        }
        if("BCDFHIKSUVXY23456".includes(ch)){
          encoded.push(".");
        }else if("AGJLMOPQRWZ01789".includes(ch)){
          encoded.push("-");
        }
        if("BDHLQRSVXZ34567".includes(ch)){
          encoded.push(".");
        }else if("CFJKOPUWY01289".includes(ch)){
          encoded.push("-");
        }
        if("CFHLPZ45678".includes(ch)){
          encoded.push(".");
        }else if("JQVXY01239".includes(ch)){
          encoded.push("-");
        }
        if("56789".includes(ch)){
          encoded.push(".");
        }else if("01234".includes(ch)){
          encoded.push("-");
        }
        return `${encoded.join("")}`;
      }
    ).join(" ");
    return newVal;
  }
}