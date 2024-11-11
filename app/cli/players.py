import os
import random
# import joblib

class Player:
    def __init__(self):
        self.name = 'Player'
        self.game = None
        self.chips = 0
        self.bet = 0
        self.hole_cards = []
        self.fold = False

    def __str__(self):
        hole_cards_str = ', '.join(str(card) for card in self.hole_cards)
        return f'{self.name} | chips: {self.chips} | {hole_cards_str} | '

    def ask_action(self, *args, **kwargs):
        # Returns a tuple (action, bet)
        # In base case returns fold
        return 0, 0

    def make_bet(self, amount):
        if amount >= self.chips:
            # All in case
            if self.chips > 0:
                self.bet += self.chips
                self.game.pot += self.chips
                self.chips = 0
            else:
                raise ValueError('No chips left to do the bet')
        else:
            # Usual case
            self.chips -= amount
            self.bet += amount
            self.game.pot += amount

class User(Player):
    def __init__(self):
        super().__init__()
        self.name = 'Billy'
        self.action = None
        self.action_bet = None

    def ask_action(self):
        # Returns a tuple (action, bet)
            action = input(f'{self} action: ')
            bet = 0

            if action == 'raise':
                bet = int(input(f'{self} bet: '))
            elif action == 'call':
                if self.game is not None:
                    bet = max(self.game.user.bet, self.game.bot.bet)

            return action, bet

class Bot(Player):
    def __init__(self):
        super().__init__()
        self.name = 'Bot'

        # Possible styles:
        # LP - loose passive (plays every hand, calls every bet)
        # TP - tight passive (plays only strongest hands, calls every bet)
        # LAG - loose aggressive (plays every hand, raises actively)
        # TAG - tight aggressive (plays only strongest hands, raises actively)
        self.style = "LAG"

        self.history = ''
        self.info_set = ''
        self.tree_map = self.load_strategies()

    def load_strategies(self):
        if os.path.exists("./app/train/HUNL-TreeMap.joblib"):
            return joblib.load("./app/train/HUNL-TreeMap.joblib")
        else:
            return {}

    def update_info_set(self):
        sorted_cards = sorted(self.hole_cards + self.game.community_cards, key=lambda card: (card.rank, card.suit))
        self.info_set = ''.join(str(card) for card in sorted_cards)

    def __str__(self):
        return super().__str__() + self.info_set + ' |'

    def ask_action(self):
        # print(self.info_set)

        fold = ('fold', 0, 'p')
        check = ('check', 0, 'p')
        call = ('call', self.game.user.bet - self.bet, 'c')
        raise_1bb = ('raise', (self.game.user.bet - self.bet) + self.game.big_blind, 'b')
        raise_2bb = ('raise', (self.game.user.bet - self.bet) + self.game.big_blind * 2, 'b')
        raise_4bb = ('raise', (self.game.user.bet - self.bet) + self.game.big_blind * 4, 'b')
        all_in = ('raise', self.chips, 'b')

        actions = [fold, check, call, raise_1bb, raise_2bb, raise_4bb, all_in]

        base_strategies = {
            'Optimal': [0.2, 0.3, 0.2, 0.14, 0.1, 0.05, 0.01],
            'LAG': [0.2, 0.2, 0.2, 0.15, 0.1, 0.1, 0.05],
            'TAG': [0.05, 0.2, 0.1, 0.25, 0.2, 0.15, 0.05],
            'TP': [0.1, 0.25, 0.4, 0.1, 0.05, 0.05, 0.05],
            'LP': [0.1, 0.3, 0.4, 0.1, 0.05, 0.03, 0.02]
        }

        if self.info_set in self.tree_map:
            obt_strategy = self.tree_map[self.info_set]
            strategy = [
                obt_strategy[0] * 0.7,
                obt_strategy[0] * 0.3,
                obt_strategy[1],
                obt_strategy[2] * 0.5,
                obt_strategy[2] * 0.3,
                obt_strategy[2] * 0.15,
                obt_strategy[2] * 0.05,
            ]
        else:
            strategy = base_strategies[self.style]

        while True:
            # Returns a list of 1 element, so we need an index at the end
            action = random.choices(actions, weights=strategy)[0]
            try:
                # Remove unnecessary folds first
                if action[0] == 'fold' and self.bet == self.game.user.bet:
                    action = check
                self.validate_action(action)
                print(f'{self}: {action}')
                # self.info_set += action[2]
                return action[0], action[1]
            except ValueError:
                continue

    def validate_action(self, action):
        act, bet = action[0], action[1]
        opponent = self.game.user

        if act == 'fold':
            return

        if act == 'check':
            if self.bet != opponent.bet:
                raise ValueError('Invalid action')
            return

        if act == 'call':
            if self.bet >= opponent.bet:
                raise ValueError('Invalid action')
            return

        if act == 'raise':
            if opponent.chips == 0:
                raise ValueError('Invalid action')
            if not ((self.game.min_bet <= bet < self.chips and opponent.bet - self.bet < bet) or
                    (bet == self.chips and opponent.bet - self.bet < bet)):
                raise ValueError('Invalid action')
            return

        raise ValueError('Invalid action')
