import { Card } from "../models/card";
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, tap } from 'rxjs';
import { Player } from "../models/player";

export enum PokerHandName{
    ROYAL_FLUSH,
    STRAIGHT_FLUSH,
    FOUR_ACES,
    FOUR_TWOS_THRU_FOURS,
    FOUR_FIVES_THRU_KINGS,
    FULL_HOUSE,
    FLUSH,
    STRAIGHT,
    THREE_OF_A_KIND,
    TWO_PAIR,
    TWO_OF_A_KIND,
    JACKS_OR_BETTER,
    HIGH_CARD
}

export interface PokerHandType {
    value: PokerHandName,
    label: string,
    score: number
}

@Injectable({
  providedIn: 'root',
})
export class PokerService{



    private readonly baseUrl = 'http://localhost:8080/poker';

    constructor(private readonly http: HttpClient) {}
    public scoreType(hand: (Card|null)[]){
        return this.http.post(this.baseUrl, hand);
    }

    public saveGame(player: Player){
        return this.http.post(`${this.baseUrl}/save`, player);
    }
    public calculateScore(hand: (Card|null)[]) : (PokerHandType | null){
        if(hand.filter(card => card).length !== 5){
            return null;
        }
        const ranks = hand.filter(card => card!==null).map(card => card.rank);
        const suits = hand.filter(card => card!==null).map(card => card.suit);

        let rankCount = new Map<number, number>();

        let isFlush = suits.every((suit,_,a) => suit===a[0]);

        let isStraight = Array(11).fill(0).map((_,i)=>i).some(rnk => 
            Array(5).fill(0).map((_,i)=>i+rnk).every(rank => ranks.includes(rank))
        );
        let isRoyal = Array(5).fill(0).map((_,i)=>i+10).every(rank => ranks.includes(rank))
        for(let rank of ranks){
            rankCount.set(rank, ranks.filter(r => r === rank).length);
        }
        let fourAces = [1,14].some(rank => {
            let count = rankCount.get(rank);
            if(!count){
                return 0;
            }
            return count >= 4;
        });
        let fourTwosThreesFours = [2,3,4].some(rank => {
            let count = rankCount.get(rank);
            if(!count){
                return 0;
            }
            return count >= 4;
        });
        let fourFivesThruKings = Array(9).fill(0).map((_,i) => i+5).some(rank => {
            let count = rankCount.get(rank);
            if(!count){
                return 0;
            }
            return count >= 4;
        });
        let jacksOrBetter = [1,11,12,13,14].some(rank => {
            let count = rankCount.get(rank);
            if(!count){
                return 0;
            }
            return count > 1;
        });
        let rankCountVals = [...rankCount.values()];
        if(isFlush && isRoyal){
            return {value: PokerHandName.ROYAL_FLUSH, label: "pokerHand.royalFlush", score:250};
        }else if(isStraight && isFlush){
            return {value:PokerHandName.STRAIGHT_FLUSH, label:"pokerHand.straightFlush", score:50};
        }else if(fourAces){
            return {value:PokerHandName.FOUR_ACES, label:"pokerHand.fourAces",score:80};
        }else if(fourTwosThreesFours){
            return {value:PokerHandName.FOUR_TWOS_THRU_FOURS, label:"pokerHand.fourTwosThruFours",score:40};
        }else if(fourFivesThruKings){
            return {value:PokerHandName.FOUR_FIVES_THRU_KINGS, label:"pokerHand.fourFivesThruKings",score:25};
        }else if(rankCountVals.includes(3) && rankCountVals.includes(2)){
            return {value:PokerHandName.FULL_HOUSE, label:"pokerHand.fullHouse",score:8};
        }else if(isFlush){
            return {value:PokerHandName.FLUSH, label:"pokerHand.flush",score:5};
        }else if(isStraight){
            return {value:PokerHandName.STRAIGHT, label:"pokerHand.straight",score:4};
        }else if(rankCountVals.includes(3)){
            return {value:PokerHandName.THREE_OF_A_KIND, label:"pokerHand.threeOfAKind",score:3};
        }else if(rankCountVals.filter(rankCount => rankCount === 2).length > 1){
            return {value:PokerHandName.TWO_PAIR, label:"pokerHand.twoPair",score:2};
        }else if(jacksOrBetter){
            return {value:PokerHandName.JACKS_OR_BETTER, label:"pokerHand.jacksOrBetter",score:1};
        }
        return {value: PokerHandName.HIGH_CARD, label:"pokerHand.highCard",score:0};
    }


}