class Card:
    def __init__(self, rank, suit):
        self.rank = rank
        # 0 - clubs (♣), 1 - diamonds (♦), 2 - hearts (♥), 3 - spades (♠)
        self.suit = suit
        # self.front_face = f'images/cards/{self.rank}_of_{["clubs", "diamonds", "hearts", "spades"][self.suit]}.png'
        # self.back_face = f'images/cards/red_back'

    def __str__(self):
        suits_symbols = ['♣', '♦', '♥', '♠']
        ranks_symbols = {11: 'J', 12: 'Q', 13: 'K', 14: 'A'}
        rank_str = ranks_symbols.get(self.rank, str(self.rank))
        suit_str = suits_symbols[self.suit]
        return f"{rank_str}{suit_str}"


class Deck(list):
    def __init__(self):
        super().__init__()
        for suit in range(4):
            for rank in range(2, 15):
                self.append(Card(rank, suit))

    def __str__(self):
        return '[' + ', '.join(str(card) for card in self) + ']'
    

def create_hand(cards: list[str]) -> list[Card]:
    res = []
    for card in cards:
        suit = ['♣', '♦', '♥', '♠'].index(card[-1])
        rank_str = card[:-1]
        rank = int(rank_str) if rank_str.isdigit() else {'J': 11, 'Q': 12, 'K': 13, 'A': 14}[rank_str]
        res.append(Card(rank=rank, suit=suit))
    return sorted(res, key=lambda x: x.rank)
    