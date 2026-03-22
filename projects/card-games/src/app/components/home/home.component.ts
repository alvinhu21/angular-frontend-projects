import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardService } from '../../services/card.service';
import { Card, Suit } from '../../models/card';
import { CommonModule } from '@angular/common';
import { HandComponent } from '../card-hand/hand.component';
import { PokerService } from '../../services/poker.service';
import { ModalComponent,  TextInputComponent,profanityValidator  } from 'shared-lib';
import { catchError, Observable, of, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import { Player } from '../../models/player';

@Component({
  selector: 'app-home',
  imports: [TranslateModule, ModalComponent, TextInputComponent, ReactiveFormsModule, CommonModule, HandComponent, TextInputComponent],
  providers: [TranslateService, CardService, PokerService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  deck: (Card|null)[] = [];
  hand: (Card|null)[] = [];
  Suit = Suit;
  id: number = Math.floor(Math.random()*1000000);
  allowedRegex: RegExp = /^[a-zA-Z ]$/;
  numbersOnly: RegExp = /^\d$/;
  roundOver: boolean = true;
  totalScore: number= 25;
  scoreType$ : Observable<any> = of();
  destroy$: Subject<void> = new Subject<void>();
  formGroup: FormGroup =  new FormGroup({
    wager: new FormControl(''),
    firstName: new FormControl('Alvin', {validators: [Validators.required, profanityValidator],updateOn: 'blur'}),
    lastName: new FormControl('Hu', {validators: [Validators.required, profanityValidator],updateOn: 'blur'}),
  });
  showWagerInput: boolean = true;
  
  @ViewChild('gameOverModal') gameOverModal!: ModalComponent;
  @ViewChild('nameModal') nameModal!: ModalComponent;
  @ViewChild('cardHand') cardHand!: HandComponent;


  addressFormGroup = new FormGroup({
    firstName: new FormControl('Alvin', {validators: [Validators.required, profanityValidator],updateOn: 'blur'}),
    lastName: new FormControl('Hu', {validators: [Validators.required, profanityValidator],updateOn: 'blur'}),
    address: new FormControl('155 A st', {updateOn: 'blur'}),
    city: new FormControl('State', {updateOn: 'blur'}),
    state: new FormControl('IN'),
    zipCode: new FormControl('46201', {updateOn: 'blur'}),
    country: new FormControl('US'),
  });

  constructor(private router: Router,
    private translateService: TranslateService,
    private cardService: CardService,
    private pokerService: PokerService)
  {
    this.translateService.use('en');
  }

  /*
              case ROYAL_FLUSH:
                handType = "Royal Flush";
                handValue = 250;
                break;
            case STRAIGHT_FLUSH:
                handType = "Straight Flush";
                handValue = 50;
                break;
            case FOUR_OF_A_KIND:
                handType = "Four of a Kind";
                handValue = 25;
                break;
            case FULL_HOUSE:
                handType = "Full House";
                handValue = 9;
                break;
            case FLUSH:
                handType = "Flush";
                handValue = 6;
                break;
            case STRAIGHT:
                handType = "Straight";
                handValue = 4;
                break;
            case THREE_OF_A_KIND:
                handType = "Three of a kind";
                handValue = 3;
                break;
            case TWO_PAIR:
                handType = "Two Pair";
                handValue = 2;
                break;
            case JACKS_OR_BETTER:
                handType = "Jacks or better";
                handValue = 1;
                break;
            default:
                handType = "High card";
                handValue = 0;
                */
  handNames = [
    {label: 'royalFlush',value:250},
    {label: 'straightFlush',value:50},
    {label: 'fourOfAKind',value:25},
    {label: 'fullHouse',value:9},
    {label: 'flush',value:6},
    {label: 'straight',value:4},
    {label: 'threeOfAKind',value:3},
    {label: 'twoPair',value:2},
    {label: 'jacksOrBetter',value:1}
  ]

  ngOnInit(): void{
  }

  ngAfterViewInit(): void{
    this.nameModal.openModal();
  }

  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }
  selectCharsOnly(event: KeyboardEvent): void {
    if(!this.allowedRegex){
      return;
    }
    const key = event.key;

    const allowed = this.allowedRegex;

    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab'
    ];


    if (!allowed.test(key) && !controlKeys.includes(key)) {
      event.preventDefault();
    }
  }
  goToAbout(){
    this.router.navigate(['/about']);
  }

  get wager(){
    return this.formGroup.get('wager')?.value;
  }

  newGame(){
    this.totalScore = 25;
    if(this.gameOverModal){
      this.gameOverModal.closeModal();
    }
    if(this.nameModal){
      this.nameModal.closeModal();
    }
    this.formGroup.get('wager')?.reset();
    this.deck = this.cardService.createDeck();
    this.hand = Array(5).fill(null);
    if(this.cardHand){
      this.cardHand.handTouched=false;
    }


  }

  startOver(){
    this.saveGame();
    this.newGame();
  }

  saveGame(){
    const player: Player = {
      id: this.id,
      firstName: this.formGroup.get('firstName')?.value,
      lastName: this.formGroup.get('lastName')?.value,
      score: this.totalScore
    };
    this.pokerService.saveGame(player).pipe(takeUntil(this.destroy$)).subscribe();
  }

  closeModal(){
    if(this.gameOverModal){
      this.gameOverModal.closeModal();
    }
  }

  get name(){
    let firstName = this.formGroup.get('firstName')?.value;
    let lastName = this.formGroup.get('lastName')?.value;
    return `${firstName} ${lastName}`
  }

  async draw(){
    this.cardHand.handTouched=true;
    if(this.totalScore === 0){
      this.totalScore = 25;
    }
    this.showWagerInput = false;
    for(let i = 0; i < this.hand.length; i++){
      let card = this.hand[i];
      if(!card?.selected){
        if(card){
          this.deck.push(card);
        }
        this.hand[i] = null;
      }
      if(card){
        card.selected = false;
      }
    }
  

    await new Promise(resolve => setTimeout(resolve, 300));
    for(let i = 0; i < this.hand.length; i++){
      let card = this.hand[i];
      if(!card){
        let drawnCard = this.deck.shift();
        if(drawnCard){
          this.hand[i] = drawnCard;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.roundOver = !this.roundOver;
    this.scoreType$ = this.pokerService.scoreType(this.hand);



    if(this.roundOver){
      let wager = this.totalScore > this.wager ? this.wager : this.totalScore;
      if(wager <= 0){
        wager = 1;
      }
      this.totalScore -= wager;
      this.scoreType$.pipe(takeUntil(this.destroy$), tap(res => {
        this.totalScore += wager * res.handValue;
        this.showWagerInput = true;
        this.formGroup.get('wager')?.reset();
        this.gameOverModal.openModal();
      }),catchError(error => {
    console.error('Pipe transformation failed', error);
    // Return an observable with a fallback value or an empty array
    console.log("SUCKING");
    return of([]); 
  })).subscribe();
      
    }
  }
  
  getName(){
    let formName = this.formGroup.get('firstName');
    if(formName){
      return formName.valid;
    }
    return '';
  }
 forbiddenNameValidator(nameRe: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Check if the value matches the forbidden pattern
    const forbidden = nameRe.test(control.value);
    
    // Return an error object if forbidden, otherwise return null
    return forbidden ? { forbiddenName: { value: control.value } } : null;
  };
}

}
