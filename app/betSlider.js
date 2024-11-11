document.addEventListener('DOMContentLoaded', function() {
    const betAmountInput = document.getElementById('bet-amount');
    const betAmountDisplay = document.getElementById('bet-amount-display');

    function updateBetAmount() {
        betAmountDisplay.textContent = betAmountInput.value;
    }

    updateBetAmount();
    betAmountInput.addEventListener('input', updateBetAmount);
});