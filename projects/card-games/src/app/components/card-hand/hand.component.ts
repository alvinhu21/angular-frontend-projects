import { Component, EventEmitter, Input,Output } from '@angular/core';
import { Card } from '../../models/card';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../card/card.component';
import { PokerService } from '../../services/poker.service';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-hand',
  imports: [CommonModule, CardComponent, TranslateModule],
  providers: [PokerService],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.scss',
})
export class HandComponent {
  @Input() hand: (Card | null)[] = [];
  @Input() selectedCardClass: string = "bg-primary"
  @Input() unselectedCardClass: string = ""
  @Input() customClass: string = 'fs-64 lh-72';
  @Input() roundOver: boolean = false;


  handTouched: boolean = false;



  constructor(){

  }

  get validHand(){
    return !this.handTouched || this.hand.filter(card => card !== null).length === 5;
  }


  setHandTouched(){
    this.handTouched = true;
  }
  
}
