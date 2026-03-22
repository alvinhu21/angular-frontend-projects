import { Component, Input } from '@angular/core';
import { Card, Suit } from '../../models/card';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-card',
  imports: [CommonModule, TranslateModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  Suit = Suit;

  @Input() class: string = "";
  @Input() selectedClass: string = "";
  @Input() unselectedClass: string = "";
  @Input() card!: Card | null;
  @Input() disabled: boolean = false;
  @Input() selectedText: string = "selected.text";


  toggleSelected(){
    if(!this.card){
      return;
    }
    this.card.selected = !this.card.selected;
  }
  get cardImage(){
    if(!this.card){
      return "&#127136;";
    }
    let bonus = 0;
    let {rank, suit} = this.card;
    if(rank === 12 || rank === 13){
      bonus = 1;
    }else if(rank === 14){
      bonus = -13;
    }
    let code = 127136 + rank + bonus;
    switch(suit){
      case Suit.SPADE:
        return `&#${code}`;
      case Suit.HEART:
        return `&#${code+16}`;
      case Suit.DIAMOND:
        return `&#${code+32}`;
      case Suit.CLUB:
        return `&#${code+48}`;
    }
  } 

  get customClass(){

    return {'text-danger' : this.isRed, [this.selectedClass] :  this.card && this.card.selected, [this.unselectedClass] : !this.card || !this.card.selected, [this.class]: true}
  }

  get isRed(){
    if(!this.card){
      return false;
    }
    return [Suit.DIAMOND, Suit.HEART].includes(this.card.suit);
  }

}
