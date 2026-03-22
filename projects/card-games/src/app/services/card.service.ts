import { Card, Suit } from "../models/card";



export class CardService{
    public createDeck(): Card[]{
        let deck: Card[] = [];
        for(let suit of [Suit.CLUB, Suit.HEART, Suit.DIAMOND, Suit.SPADE]){
            for(let i = 2; i <= 14; i++){
                deck.push({suit, rank: i});
            }
        }
        deck.sort(() => Math.random()-0.5);
        return deck;
    }
}