// photovoltaic.js - simulazione base dati fotovoltaico Huawei

function loadProductionData() {
    const productionDiv = document.getElementById('productionData');
    // Simulazione dati produzione (kW)
    const productionKw = (Math.random() * 5 + 1).toFixed(2);
    productionDiv.innerHTML = `Produzione attuale: ${productionKw} kW`;
}

function loadBatteryStatus() {
    const batteryDiv = document.getElementById('batteryStatus');
    // Simulazione stato batteria
    const batteryLevel = (Math.random() * 100).toFixed(0);
    const charging = Math.random() > 0.5 ? 'in carica' : 'in scarica';
    batteryDiv.innerHTML = `Livello batteria: ${batteryLevel}% (${charging})`;
}

function loadHistoryData() {
    const historyDiv = document.getElementById('historyData');
    // Simulazione storico dati giornalieri
    const days = 7;
    let html = '<ul>';
    for (let i = 0; i < days; i++) {
        html += `<li>Giorno ${i+1}: ${(Math.random() * 20).toFixed(2)} kWh</li>`;
    }
    html += '</ul>';
    historyDiv.innerHTML = html;
}

// Caricamento dati all'avvio pagina
window.onload = () => {
    loadProductionData();
    loadBatteryStatus();
    loadHistoryData();
    // Qui si possono aggiungere chiamate reali a moduli di backend o API del sistema Huawei
};
