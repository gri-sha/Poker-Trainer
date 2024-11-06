import numpy as np
import itertools
import joblib
from tqdm import tqdm
from app.poker.poker import *


game = Game()

FOLD_CHECK = 'p'  # pass
CALL = 'c'  # call 
RAISE = 'b'  # bet

ACTIONS = [FOLD_CHECK, CALL, RAISE]
NUM_ACTIONS = 3
BET = game.big_blind

TreeMap = {}


class Node:
    def __init__(self):
        self.infoSet = ''
        self.regretSum = np.zeros(NUM_ACTIONS)
        self.strategy = np.zeros(NUM_ACTIONS)
        self.strategySum = np.zeros(NUM_ACTIONS)

    def getStrategy(self, realizationWeight):
        self.strategy = np.maximum(0, self.regretSum)
        normalizingSum = np.sum(self.strategy)

        if normalizingSum > 0:
            self.strategy /= normalizingSum
        else:
            self.strategy = np.ones_like(self.strategy) / NUM_ACTIONS

        self.strategySum += realizationWeight * self.strategy

        return self.strategy

    def getAverageStrategy(self):
        normalizingSum = np.sum(self.strategySum)
        avgStrategy = np.zeros(NUM_ACTIONS)

        if normalizingSum > 0:
            avgStrategy = self.strategySum / normalizingSum
        else:
            avgStrategy = np.ones_like(self.strategySum) / NUM_ACTIONS

        return avgStrategy

    def display(self):
        average_strategy = np.around(self.getAverageStrategy(), 2)
        print(f"{self.infoSet} -> {average_strategy}")


def cfr_preflop(hole_cards, history, p0, p1):

    game.players[game.sb_pos].hole_cards = hole_cards[:2]
    game.players[game.bb_pos].hole_cards = hole_cards[2:]

    # at first small blind chooses action
    player = game.players[len(history) % 2]
    opponent = game.players[1 - len(history) % 2]

    # Determine whether the node is terminal
    if len(history) > 1:
        if history[-2:] == 'bp':  # raise (all-in), fold
            return game.pot
        elif history[-2:] == 'cp':  # call, check
            return game.pot if game.determine_winner() == player else -game.pot
        elif history[-2:] == 'bc':  # raise (all-in), call
            return game.pot if game.determine_winner() == player else -game.pot
        elif history[-2:] == 'bb' and opponent.chips == 0:  # raise, all-in
            return game.pot if game.determine_winner() == player else -game.pot
    elif len(history) == 1:
        if history[0] == 'p':  # fold
            return -game.pot

    infoSet = ''.join(str(card) for card in player.hole_cards) + history
    if infoSet not in TreeMap:
        node = Node()
        node.infoSet = infoSet
        TreeMap[infoSet] = node
    else:
        node = TreeMap[infoSet]

    strategy = node.getStrategy(p0 if player == game.players[0] else p1)
    util = np.zeros(NUM_ACTIONS)
    nodeUtil = 0

    for pos, act in enumerate(ACTIONS):
        if act == 'p':
            if player.bet < opponent.bet: # fold case
                nextHistory = history +'p'
            elif player.bet == opponent.bet: # check case
                nextHistory = history +'p'
            else:
                continue # not possible action is this case
        elif act == 'c':
            if player.bet < opponent.bet:
                player.make_bet(abs(player.bet-opponent.bet))
                nextHistory = history +'c'
            else:
                continue
        elif act == 'b':
            if opponent.chips != 0 and player.bet < opponent.bet:
                player.make_bet(abs(player.bet-opponent.bet) + BET)
                nextHistory = history +'b'
            else:
                continue
        if player == game.players[0]:
            util[pos] = - cfr_preflop(hole_cards, nextHistory, p0 * strategy[pos], p1)
        else:
            util[pos] = - cfr_preflop(hole_cards, nextHistory, p0, p1 * strategy[pos])

    for pos in range(NUM_ACTIONS):
        regret = util[pos] - nodeUtil
        node.regretSum[pos] += (p1 if player == game.players[0] else p0) * regret

    return nodeUtil



def cfr(community_cards, hole_cards, history, p0, p1):

    game.user.hole_cards = hole_cards[:2]
    game.user.hole_cards = hole_cards[2:]
    game.community_cards = community_cards

    player = game.players[len(history) % 2]
    opponent = game.players[1 - player]

    pass


def train_preflop(iterations):
    game.players[game.sb_pos].make_bet(game.small_blind)
    game.players[game.bb_pos].make_bet(game.big_blind)

    util = 0

    for i in tqdm(range(iterations), desc="Training Loop"):
        cards = random.sample(game.deck, 4)
        util += cfr_preflop(hole_cards=cards, history='', p0=1, p1=1)
        if i and (i % 100_000 == 0):
            print(" Average game value: ", util / (i + 1))

    print("Training complete.")


def train(iterations, num_cards=3):
    utils = []
    community_combinations = list(itertools.combinations(game.deck, num_cards))
    for community_cards in tqdm(community_combinations, desc="Community Cards Combinations"):
        util = 0
        selected_set = set(community_cards)
        remaining_cards = [card for card in game.deck if card not in selected_set]
        for _ in tqdm(range(iterations), desc="Training Loop", leave=False):
            hole_cards = random.sample(remaining_cards, 4)
            util += cfr(community_cards, hole_cards, '', 1, 1)
        utils.append(util)
    avg_util = np.mean(utils)
    print(f"Average Utility: {avg_util}")
    pass


if __name__ == "__main__":
    train_from_scratch = True
    if train_from_scratch:
        train_preflop(1_000_000)
        train(1200, 3)
        train(800, 4)
        train(400, 5)
        # joblib.dump(TreeMap, "HUNL-TreeMap.joblib")
    else:
        TreeMap = joblib.load("HUNL-TreeMap.joblib")

    print("Total Number of Infosets:", len(TreeMap))
    for infoSet in TreeMap:
        TreeMap[infoSet].display()

    print(game.pot)
