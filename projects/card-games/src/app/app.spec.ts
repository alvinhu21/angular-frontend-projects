import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Suit } from './models/card';
import { PokerHandName, PokerService } from './services/poker.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, card-games');
  });

  it('should get Royal Flush', () => {
    const Cards = [{suit: Suit.CLUB, rank: 10},{suit: Suit.CLUB, rank: 11},{suit: Suit.CLUB, rank: 12},{suit: Suit.CLUB, rank: 13},{suit: Suit.CLUB, rank: 14}]
    let pokerService = new PokerService();
    expect(pokerService.calculateScore(Cards)).toEqual(PokerHandName.ROYAL_FLUSH);
  });
});
