import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'formatTime'
})
export class FormatTimePipe implements PipeTransform {

  transform(ms: number): string {
    if (ms === null || ms < 0) {
      return '00:00:00';
    }

    const totalSeconds = Math.ceil(ms/1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor( (totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if(seconds > 0){
      let arrFormat: number[]= [];
      if(days > 0){
        arrFormat = [days, hours, minutes, seconds];
      }else if(hours > 0){
        arrFormat = [hours, minutes, seconds];
      }else if(minutes > 0){
        arrFormat = [minutes, seconds];
      }
      return arrFormat.map((unit, i) => i > 0 ? unit.toString().padStart(2, '0') : unit)
        .join(':');
    }

    return `${seconds}`;

  }
}