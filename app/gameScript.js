// ============================================================================ //
//                                Cards                                         //
// ============================================================================ //

class Card {
    static suitsSymbols = ['♣', '♦', '♥', '♠'];
    static ranksSymbols = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

    constructor(rank, suit) {
        this.rank = rank; // Rank of the card
        this.suit = suit; // Suit of the card (0 - clubs, 1 - diamonds, 2 - hearts, 3 - spades)
    }

    toString() {
        const rankStr = Card.ranksSymbols[this.rank] || this.rank.toString();
        const suitStr = Card.suitsSymbols[this.suit];
        return `${rankStr}${suitStr}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        for (let suit = 0; suit < 4; suit++) {
            for (let rank = 2; rank <= 14; rank++) {
                this.cards.push(new Card(rank, suit));
            }
        }
    }

    toString() {
        return '[' + this.cards.map(card => card.toString()).join(', ') + ']';
    }
}

function createHand(cards) {
    const res = [];
    for (const card of cards) {
        const suit = Card.suitsSymbols.indexOf(card.slice(-1));
        const rankStr = card.slice(0, -1);
        const rank = !isNaN(rankStr) ? parseInt(rankStr) : { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 }[rankStr];
        res.push(new Card(rank, suit));
    }
    return res.sort((a, b) => a.rank - b.rank);
}


// ============================================================================ //
//                                Players                                       //
// ============================================================================ //

class Player {
    constructor() {
        this.name = 'Player';
        this.game = null;
        this.chips = 0;
        this.bet = 0;
        this.holeCards = [];
        this.fold = false;
    }

    toString() {
        const holeCardsStr = this.holeCards.map(card => card.toString()).join(', ');
        return `${this.name} | chips: ${this.chips} | ${holeCardsStr} | `;
    }

    askAction() {
        // Returns [action, bet]
        // In base case returns fold
        return [0, 0];
    }

    makeBet(amount) {
        if (amount >= this.chips) {
            // All in case
            if (this.chips > 0) {
                this.bet += this.chips;
                this.game.pot += this.chips;
                this.chips = 0;
            } else {
                throw new Error('No chips left to do the bet');
            }
        } else {
            // Usual case
            this.chips -= amount;
            this.bet += amount;
            this.game.pot += amount;
        }
    }
}

class User extends Player {
    constructor() {
        super();
        this.name = 'Billy';
        this.action = null;
        this.actionBet = null;
    }

    askAction() {
        return new Promise((resolve) => {
            const foldButton = document.getElementById('fold-button');
            const checkButton = document.getElementById('check-button');
            const callButton = document.getElementById('call-button');
            const raiseButton = document.getElementById('raise-button');
            const betAmountInput = document.getElementById('bet-amount');
    
            foldButton.onclick = () => {
                this.returnAction('fold');
                resolve(['fold', 0]);
            };
            checkButton.onclick = () => {
                this.returnAction('check');
                resolve(['check', 0]);
            };
            callButton.onclick = () => {
                this.returnAction('call');
                resolve(['call', this.actionBet]);
            };
            raiseButton.onclick = () => {
                const betAmount = parseInt(betAmountInput.value, 10);
                this.returnAction('raise', betAmount);
                resolve(['raise', betAmount]);
            };
        });
    }

    returnAction(action, bet = 0) {
        this.action = action;
        this.actionBet = bet;

        console.log(`Action: ${this.action}, Bet: ${this.actionBet}`);
        return [action, bet];
    }
}

class Bot extends Player {
    constructor() {
        super();
        this.name = 'Bot';
        this.style = "LAG";
        this.history = '';
        this.infoSet = '';
        this.treeMap = this.loadStrategies();
    }

    async loadStrategies() {
        // Path to the JSON file
        // const path = "./app/train/HUNL-TreeMap.json"; // JSON format for simplicity
    
        // try {
        //     const response = await fetch(path);
            
        //     if (!response.ok) {
        //         throw new Error(`HTTP error! status: ${response.status}`);
        //     }

        //     const data = await response.json();
        //     return data;
        // } catch (error) {
        //     console.error('Error loading JSON:', error);
        //     return {};
        // }
        return {};
    }

    updateInfoSet() {
        const sortedCards = [...this.holeCards, ...this.game.communityCards].sort((a, b) => {return a.rank - b.rank || a.suit - b.suit;});
        this.infoSet = sortedCards.map(card => card.toString()).join('');
    }

    toString() {
        return super.toString() + this.infoSet + ' |';
    }

    askAction() {
        const actions = [
            ['fold', 0, 'p'],
            ['check', 0, 'p'],
            ['call', this.game.user.bet - this.bet, 'c'],
            ['raise', (this.game.user.bet - this.bet) + this.game.bigBlind, 'b'],
            ['raise', (this.game.user.bet - this.bet) + this.game.bigBlind * 2, 'b'],
            ['raise', (this.game.user.bet - this.bet) + this.game.bigBlind * 4, 'b'],
            ['raise', this.chips, 'b']
        ];

        const baseStrategies = {
            'Optimal': [0.2, 0.3, 0.2, 0.14, 0.1, 0.05, 0.01],
            'LAG': [0.2, 0.2, 0.2, 0.15, 0.1, 0.1, 0.05],
            'TAG': [0.05, 0.2, 0.1, 0.25, 0.2, 0.15, 0.05],
            'TP': [0.1, 0.25, 0.4, 0.1, 0.05, 0.05, 0.05],
            'LP': [0.1, 0.3, 0.4, 0.1, 0.05, 0.03, 0.02]
        };

        let strategy;
        if (this.infoSet in this.treeMap) {
            const obtStrategy = this.treeMap[this.infoSet];
            strategy = [
                obtStrategy[0] * 0.7,
                obtStrategy[0] * 0.3,
                obtStrategy[1],
                obtStrategy[2] * 0.5,
                obtStrategy[2] * 0.3,
                obtStrategy[2] * 0.15,
                obtStrategy[2] * 0.05,
            ];
        } else {
            strategy = baseStrategies[this.style];
        }

        while (true) {
            const action = this.randomChoice(actions, strategy);
            try {
                // Remove unnecessary folds
                if (action[0] === 'fold' && this.bet === this.game.user.bet) {
                    action = actions[1]; // Change it to check
                }
                this.validateAction(action);
                console.log(`${this}: ${action}`);
                return [action[0], action[1]];
            } catch (error) {
                continue;
            }
        }
    }

    randomChoice(actions, weights) {
        // array.reduce((accumulator, currentValue) => { /* logic */ }, initialValue);
        const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
        // Math.random() returns value between 0 (inclusive) and 1 (exclusive)
        const randomNum = Math.random() * totalWeight;
        let cumulativeWeight = 0;

        for (let i = 0; i < actions.length; i++) {
            cumulativeWeight += weights[i];
            if (randomNum < cumulativeWeight) {
                return actions[i];
            }
        }
    }

    validateAction(action) {
        const [act, bet] = action;
        const opponent = this.game.user;

        if (act === 'fold') {
            return;
        }

        if (act === 'check') {
            if (this.bet !== opponent.bet) {
                throw new Error('Invalid action');
            }
            return;
        }

        if (act === 'call') {
            if (this.bet >= opponent.bet) {
                throw new Error('Invalid action');
            }
            return;
        }

        if (act === 'raise') {
            if (opponent.chips === 0) {
                throw new Error('Invalid action');
            }
            if (!((this.game.minBet <= bet && bet < this.chips && opponent.bet - this.bet < bet) ||
                (bet === this.chips && opponent.bet - this.bet < bet))) {
                throw new Error('Invalid action');
            }
            return;
        }

        throw new Error('Invalid action');
    }
}

// ============================================================================ //
//                                Game                                          //
// ============================================================================ //

class Game {
    constructor() {
        // Game parameters
        this.startingChips = 5000;
        this.smallBlind = 250;
        this.playingStyle = 'Optimal';

        // User
        this.user = new User();
        this.user.game = this;
        this.user.chips = this.startingChips;

        // Bot
        this.bot = new Bot();
        this.bot.game = this;
        this.bot.chips = this.startingChips;
        this.bot.style = this.playingStyle;

        // Positions distribution
        this.players = [this.bot, this.user];
        this.shuffle(this.players);
        this.sbPos = 0;
        this.bbPos = 1;

        // Cards
        this.deck = new Deck();
        this.shuffle(this.deck.cards, 3);

        this.cardsForCurrentHand = this.getRandomCards(this.deck.cards, 9);
        this.communityCards = [];

        // Bets
        this.bigBlind = 2 * this.smallBlind;
        this.minBet = this.bigBlind;
        this.user.bet = 0;
        this.bot.bet = 0;
        this.pot = 0;
        this.winner = null;
    }

    shuffle(array, count=1) {
        for (let k=0; k<count; k++) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]]; // Swap elements
            }
        }
    }

    getRandomCards(deck, count) {
        const shuffledDeck = [...deck];
        this.shuffle(shuffledDeck);
        return shuffledDeck.slice(0, count);
    }

    displayCards() {
        const suitColors = {
            0: 'black', // Clubs
            1: 'red',   // Diamonds
            2: 'red',   // Hearts
            3: 'black'  // Spades
        };

        // Display user cards
        const userCard1 = document.getElementById('user-card1');
        const userCard2 = document.getElementById('user-card2');
        this.setCardDisplay(userCard1, this.user.holeCards[0]);
        this.setCardDisplay(userCard2, this.user.holeCards[1]);

        // Display bot cards
        const botCard1 = document.getElementById('bot-card1');
        const botCard2 = document.getElementById('bot-card2');
        this.setCardDisplay(botCard1, this.bot.holeCards[0]);
        this.setCardDisplay(botCard2, this.bot.holeCards[1]);
    
        // Display community cards
        const webCommunityCards = [
            document.getElementById('card1'),
            document.getElementById('card2'),
            document.getElementById('card3'),
            document.getElementById('card4'),
            document.getElementById('card5')
        ];
    
        for (let i = 0; i < this.communityCards.length; i++) {
            this.setCardDisplay(webCommunityCards[i], this.communityCards[i]);
        }
    
        // Clear any remaining community card displays
        for (let i = this.communityCards.length; i < webCommunityCards.length; i++) {
            webCommunityCards[i].textContent = '';
        }
    }

    setCardDisplay(element, card) {
        const suitColor = {
            0: 'black', // Clubs
            1: 'red',   // Diamonds
            2: 'red',   // Hearts
            3: 'black'  // Spades
        }[card.suit];

        element.textContent = card.toString();
        element.style.color = suitColor;
    }

    displayChipsBetsPot() {
        document.getElementById('pot-amount').textContent = this.pot;
        document.getElementById('user-chips').textContent = this.user.chips;
        document.getElementById('user-bet').textContent = this.user.bet;
        document.getElementById('bot-chips').textContent = this.bot.chips;
        document.getElementById('bot-bet').textContent = this.bot.bet;
    }

    async play() {
        console.log(`:::: New Game: ${new Date().toISOString().slice(0, 19).replace('T', '-')}`);
        console.log(`:::: Bot Playing Style: ${this.bot.style}`);
    
        let i = 1;
        while (this.user.chips > 0 && this.bot.chips > 0) {
            console.log(`:::: Hand #${i}`);
            console.log();
    
            // Preflop
            this.players[this.sbPos].makeBet(this.smallBlind);
            console.log(`:::: SB: ${this.players[this.sbPos].name}`);
    
            this.players[this.bbPos].makeBet(this.bigBlind);
            console.log(`:::: BB: ${this.players[this.bbPos].name}`);
    
            this.dealHoleCards();
            this.bot.updateInfoSet();
            console.log(`:::: Dealing hole cards: ${this.user.name} - ${this.user.holeCards.map(card => card.toString())}, ${this.bot.name} - ${this.bot.holeCards.map(card => card.toString())}`);
            console.log();
    
            console.log(`:::: Preflop`);
    
            if (await this.bidding(true)) {
                this.dealCommunityCards(3);
                this.bot.updateInfoSet();
    
                console.log();
                console.log(`:::: Flop: ${this.communityCards.map(card => card.toString())}`);
    
                if (await this.bidding()) {
                    this.dealCommunityCards(1);
                    this.bot.updateInfoSet();
    
                    console.log();
                    console.log(`:::: Turn: ${this.communityCards.map(card => card.toString())}`);
    
                    if (await this.bidding()) {
                        this.dealCommunityCards(1);
                        this.bot.updateInfoSet();
    
                        console.log();
                        console.log(`:::: River: ${this.communityCards.map(card => card.toString())}`);
    
                        if (await this.bidding()) {
                            console.log();
                            console.log(":::: Showdown:");
                            this.winner = this.determineWinner();
                        } else {
                            this.winner = this.postFoldDetermineWinner();
                        }
                    } else {
                        this.winner = this.postFoldDetermineWinner();
                    }
                } else {
                    this.winner = this.postFoldDetermineWinner();
                }
            } else {
                this.winner = this.postFoldDetermineWinner();
            }
    
            if (this.winner !== null) {
                console.log(`:::: Winner: ${this.winner.name}`);
                this.winner.chips += this.pot;
            } else {
                console.log();
                console.log(`:::: It is a draw`);
                this.user.chips += Math.floor(this.pot / 2);
                this.bot.chips += Math.floor(this.pot / 2);
            }
    
            console.log(`:::: End of the hand: ${this.user.name} - ${this.user.chips} chips | ${this.bot.name} - ${this.bot.chips} chips`);
            console.log();
            this.swapPositions();
            this.clear();
            i++;
        }
    
        if (this.user.chips <= 0) {
            console.log(":::: Game over! You ran out of chips.");
        } else if (this.bot.chips <= 0) {
            console.log(":::: Congratulations! You defeated the bot.");
        }
    }
    
    clear() {
        this.communityCards = [];
        this.cardsForCurrentHand = this.getRandomCards(this.deck.cards, 9); // Assuming getRandomCards is defined to sample cards
        this.pot = 0;
    
        this.user.bet = 0;
        this.user.holeCards = [];
        this.user.fold = false;
    
        this.bot.bet = 0;
        this.bot.holeCards = [];
        this.bot.fold = false;
        this.bot.infoSet = '';
    
        this.winner = null;
    }

    dealHoleCards() {
        for (let i = 0; i < 2; i++) {
            this.players[i].holeCards = this.cardsForCurrentHand.slice(0, 2);
            this.cardsForCurrentHand.splice(0, 2);
        }
    }

    dealCommunityCards(num) {
        this.communityCards.push(...this.cardsForCurrentHand.slice(0, num));
        this.cardsForCurrentHand.splice(0, num);
    }

    swapPositions() {
        [this.sbPos, this.bbPos] = [this.bbPos, this.sbPos];
    }

    async bidding(preflop = false) {
        /*
        * @param preflop: determines game stage
        * @return: False if fold, True otherwise
        */
        let i;
        let player;
        let opponent;
    
        if (preflop) {
            i = this.sbPos;
            player = this.players[i];  // SB at preflop
            opponent = this.players[1 - i];  // BB at preflop
    
            // Cases if a player is all-in because of blinds
            if (player.chips === 0) {
                console.log(`:::: ${this.user.name} bet: ${this.user.bet} | ${this.bot.name} bet: ${this.bot.bet} | total: ${this.pot}`);
                console.log(`${player.name} is already all-in`);
                return true;
            } else if (opponent.chips === 0) {
                console.log(`:::: ${this.user.name} bet: ${this.user.bet} | ${this.bot.name} bet: ${this.bot.bet} | total: ${this.pot}`);
                if (player === this.user) {
                    const [act, bet] = await player.askAction();
                } else {
                    const [act, bet] = player.askAction();
                }
                if (act === 'call') {
                    // Bet the full big blind
                    player.makeBet(this.bigBlind - player.bet);
                    console.log(`${opponent.name} is already all-in`);
                    this.bot.infoSet += 'c';
                    return true;
                } else if (act === 'fold') {
                    player.fold = true;
                    console.log(`${player.name} has folded`);
                    this.bot.infoSet += 'p';
                    return false;
                } else {
                    throw new Error('Invalid action');
                }
            }
        } else {
            i = this.bbPos;
            player = this.players[i];
            opponent = this.players[1 - i];
    
            // Case if a player is all-in from the previous bidding
            if (player.chips === 0 || opponent.chips === 0) {
                console.log('There is a player already all in');
                return true;
            }
        }
    
        // Usual bidding
        let asked = 0;
        while (true) {
            console.log(`:::: ${this.user.name} bet: ${this.user.bet} | ${this.bot.name} bet: ${this.bot.bet} | total: ${this.pot}`);
            // console.log(`${player.toString()}`);
            
            if (player === this.user) {
                const [act, bet] = await player.askAction();
            } else {
                const [act, bet] = player.askAction();
            }
            let propAct = false;
            asked++;
    
            while (!propAct) {
                try {
                    if (act === 'fold') {
                        player.fold = true;
                        console.log(`${player.name} has folded`);
                        this.bot.infoSet += 'p';
                        return false;
                    } else if (act === 'check') {
                        if (player.bet !== opponent.bet) {
                            throw new Error('Invalid action');
                        } else {
                            this.bot.infoSet += 'p';
                            if (asked >= 2) {
                                return true;
                            }
                        }
                    } else if (act === 'call') {
                        if (player.bet < opponent.bet) {
                            this.bot.infoSet += 'c';
                            player.makeBet(opponent.bet - player.bet);
                        } else {
                            throw new Error('Invalid action');
                        }
                        if (asked >= 2) {
                            return true;
                        }
                    } else if (act === 'raise') {
                        if (opponent.chips === 0) {
                            throw new Error('Invalid action');
                        }
    
                        if (this.minBet <= bet && bet < player.chips && opponent.bet - player.bet < bet) {
                            // Usual case, bet is greater than minimum bet
                            player.makeBet(bet);
                            this.bot.infoSet += 'b';
                        } else if (bet === player.chips && opponent.bet - player.bet < bet) {
                            // All in case, bet can be less than minimum bet
                            player.makeBet(bet);
                            this.bot.infoSet += 'b';
                        } else {
                            throw new Error('Invalid action');
                        }
                    } else {
                        throw new Error('Invalid action');
                    }
                    propAct = true;
                } catch (error) {
                    console.log("Invalid action. Please try again.");
                    if (player === this.user) {
                        const [act, bet] = await player.askAction();
                    } else {
                        const [act, bet] = player.askAction();
                    }
                }
            }
    
            // Ask next
            i = 1 - i;
            player = this.players[i];
            opponent = this.players[1 - i];
        }
    }
    

    determineWinner() {
        let winner = null;
    
        const combinations = {
            1: 'high card',
            2: 'pair',
            3: 'two pairs',
            4: 'three of a kind',
            5: 'straight',
            6: 'flush',
            7: 'full house',
            8: 'four of a kind',
            9: 'straight flush',
            10: 'royal flush'
        };
    
        const userHand = [...this.user.holeCards, ...this.communityCards].sort((a, b) => a.rank - b.rank);
        const userCombo = this.evaluateHand(userHand);
        console.log(`${this.user.name} has ${combinations[userCombo[0]]}`);
    
        const botHand = [...this.bot.holeCards, ...this.communityCards].sort((a, b) => a.rank - b.rank);
        const botCombo = this.evaluateHand(botHand);
        console.log(`${this.bot.name} has ${combinations[botCombo[0]]}`);
    
        if (userCombo[0] > botCombo[0]) {
            winner = this.user;
        } else if (botCombo[0] > userCombo[0]) {
            winner = this.bot;
        } else {
            // Equal combinations
            if (userCombo[0] === 1) {
                // High card
                winner = this.compareKicker();
            } else if (userCombo[0] === 2 || userCombo[0] === 4 || userCombo[0] === 8) {
                // Pair or three of a kind or four of a kind
                if (userCombo[1] > botCombo[1]) {
                    winner = this.user;
                } else if (userCombo[1] < botCombo[1]) {
                    winner = this.bot;
                } else {
                    winner = this.compareKicker();
                }
            } else if (userCombo[0] === 3 || userCombo[0] === 7) {
                // Two pairs or full house
                if (userCombo[1][0] > botCombo[1][0]) {
                    winner = this.user;
                } else if (userCombo[1][0] < botCombo[1][0]) {
                    winner = this.bot;
                } else {
                    if (userCombo[1][1] > botCombo[1][1]) {
                        winner = this.user;
                    } else if (userCombo[1][1] < botCombo[1][1]) {
                        winner = this.bot;
                    } else {
                        winner = this.compareKicker();
                    }
                }
            } else if (userCombo[0] === 5 || userCombo[0] === 9) {
                // Straight or straight flush
                if (userCombo[1] > botCombo[1]) {
                    winner = this.user;
                } else if (userCombo[1] < botCombo[1]) {
                    winner = this.bot;
                } else {
                    winner = this.compareKicker();
                }
            } else if (userCombo[0] === 6) {
                // Flush
                for (let i = 0; i < 5; i++) {
                    if (userCombo[1][i] > botCombo[1][i]) {
                        winner = this.user;
                        break;
                    }
                    if (botCombo[1][i] > userCombo[1][i]) {
                        winner = this.bot;
                        break;
                    }
                }
    
                if (winner === null) {
                    winner = this.compareKicker();
                }
            } else if (userCombo[0] === 10) {
                // Royal flush
                winner = this.compareKicker();
            }
        }
    
        return winner;
    }
    
    postFoldDetermineWinner() {
        if (this.user.fold) {
            return this.bot;
        } else {
            return this.user;
        }
    }

    evaluateHand(sortedCards) {
        // Cards are sorted by ascending rank
        const handEvaluators = [
            this.royalFlush,
            this.straightFlush,
            this.fourOfKind,
            this.fullHouse,
            this.flush,
            this.straight,
            this.threeOfKind,
            this.pairOrTwo
        ];
    
        for (const evaluator of handEvaluators) {
            const combo = evaluator.call(this, sortedCards); // Use call to maintain the context
            if (combo !== null) {
                return combo;
            }
        }
    
        // High card
        return [1, 0];
    }

    royalFlush(cards) {
        // Cards are sorted by ascending rank
        if (this.straightFlush(cards.slice(2))) {
            if (cards[cards.length - 1].rank === 14) {
                return [10, 0];
            }
        }
        return null;
    }
    
    straightFlush(cards) {
        if (cards.length === 0) {
            return null;
        }
        // Cards are sorted by ascending rank
        // The 'wheel' case: A2345
        const cards2 = [...cards]; // Shallow copy of cards
        if (cards2[cards2.length - 1].rank === 14) {
            cards2.unshift({ rank: 1, suit: cards2[cards2.length - 1].suit }); // Add Ace as 1
        }
    
        let count = 1;
        let maxCount = 1;
        let maxCard = null;
    
        for (let i = 0; i < cards2.length - 1; i++) {
            if (cards2[i].rank - cards2[i + 1].rank === -1 && cards2[i].suit === cards2[i + 1].suit) {
                count++;
                maxCount = Math.max(maxCount, count);
                maxCard = cards2[i + 1];
            } else {
                count = 1;
            }
        }
    
        if (maxCount >= 5) {
            return [9, maxCard.rank];
        } else {
            return null;
        }
    }
    
    fourOfKind(cards) {
        // Cards are sorted by ascending rank
        for (let i = 0; i < cards.length - 3; i++) {
            if (cards[i].rank === cards[i + 1].rank && cards[i].rank === cards[i + 2].rank && cards[i].rank === cards[i + 3].rank) {
                return [8, cards[i].rank];
            }
        }
        return null;
    }
    
    fullHouse(cards) {
        // Cards are sorted by ascending rank
        const counts = {};
        for (const card of cards) {
            const rank = card.rank;
            counts[rank] = (counts[rank] || 0) + 1;
        }
    
        const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
        if (sortedCounts[0][1] >= 3 && sortedCounts[1][1] >= 2) {
            return [7, [parseInt(sortedCounts[0][0]), parseInt(sortedCounts[1][0])]];
        }
    
        return null;
    }
    
    flush(cards) {
        // Cards are sorted by ascending rank
        const counts = {};
        for (const card of cards) {
            counts[card.suit] = counts[card.suit] || [];
            counts[card.suit].push(card.rank);
        }
    
        const maxCount = Math.max(...Object.values(counts).map(suitCards => suitCards.length));
        if (maxCount >= 5) {
            const flushSuit = Object.keys(counts).reduce((a, b) => counts[a].length > counts[b].length ? a : b);
            const flushRanks = counts[flushSuit].sort((a, b) => b - a); // Sort ranks in descending order
            return [6, flushRanks, flushSuit];
        } else {
            return null;
        }
    }
    
    straight(cards) {
        // Cards are sorted by ascending rank
        // The 'wheel' case: A2345
        const cards2 = [...cards]; // Shallow copy of cards
        if (cards2[cards2.length - 1].rank === 14) {
            cards2.unshift({ rank: 1, suit: cards2[cards2.length - 1].suit }); // Add Ace as 1
        }
    
        let count = 1;
        let maxCount = 1;
        let maxCard = null;
    
        for (let i = 0; i < cards2.length - 1; i++) {
            if (cards2[i].rank - cards2[i + 1].rank === -1) {
                count++;
                maxCount = Math.max(maxCount, count);
                maxCard = cards2[i + 1];
            } else {
                count = 1;
            }
        }
    
        if (maxCount >= 5) {
            return [5, maxCard.rank];
        } else {
            return null;
        }
    }

    threeOfKind(cards) {
        // Cards are sorted by ascending rank
        for (let i = 0; i < cards.length - 2; i++) {
            if (cards[i].rank === cards[i + 1].rank && cards[i].rank === cards[i + 2].rank) {
                return [4, cards[i].rank];
            }
        }
        return null;
    }
    
    pairOrTwo(cards) {
        // Cards are sorted by ascending rank
        const pairs = [];
        for (let i = 0; i < cards.length - 1; i++) {
            if (cards[i].rank === cards[i + 1].rank) {
                // In the result pairs are sorted by descending rank
                pairs.unshift(cards[i].rank); // Insert at the beginning to keep it sorted
            }
        }
        if (pairs.length >= 2) {
            return [3, pairs];
        } else if (pairs.length === 1) {
            return [2, pairs[0]];
        } else {
            return null;
        }
    }
    
    compareKicker() {
        // Cards are sorted by descending rank
        const userCards = this.user.holeCards.sort((a, b) => b.rank - a.rank);
        const botCards = this.bot.holeCards.sort((a, b) => b.rank - a.rank);
        let winner = null;
    
        if (userCards.length > 0 && botCards.length > 0) {
            if (userCards[0].rank > botCards[0].rank) {
                winner = this.user;
            } else if (userCards[0].rank < botCards[0].rank) {
                winner = this.bot;
            } else {
                if (userCards.length > 1 && botCards.length > 1) {
                    if (userCards[1].rank > botCards[1].rank) {
                        winner = this.user;
                    } else if (userCards[1].rank < botCards[1].rank) {
                        winner = this.bot;
                    }
                }
            }
        }
    
        return winner;
    }    
}

const game = new Game();
// game.play();

game.user.holeCards = createHand(['7♣' ,'K♥']);
game.bot.holeCards = createHand(['7♥' ,'K♦']);
game.communityCards = game.getRandomCards(game.deck.cards, 5);
console.log(game.user.toString(), game.bot.toString());
game.displayCards();
game.displayChipsBetsPot();