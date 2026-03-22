export enum Suit{
    CLUB = 'CLUB',
    DIAMOND = 'DIAMOND',
    HEART = 'HEART',
    SPADE = 'SPADE'
}    
export interface Card{
    suit: Suit;
    rank: number;
    selected?: boolean;
}