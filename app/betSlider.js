document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('bet-amount');
    const betAmountDisplay = document.getElementById('bet-amount-display');

    function updateBetAmount() {
        betAmountDisplay.textContent = slider.value;
    }
    updateBetAmount();

    slider.addEventListener('input', updateBetAmount);
});