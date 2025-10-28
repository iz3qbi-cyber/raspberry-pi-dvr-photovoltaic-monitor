async function loadPhotovoltaicData() {
    try {
        const response = await fetch('/api/huawei-data');
        if (response.ok) {
            const data = await response.json();
            const container = document.getElementById('photovoltaicData');
            container.innerHTML = `
                <p>Valori letti dal fotovoltaico:</p>
                <ul>${data.map((v, i) => `<li>Registro ${i}: ${v}</li>`).join('')}</ul>
            `;
        } else {
            alert('Errore nel caricamento dati fotovoltaico');
        }
    } catch {
        alert('Errore nella comunicazione con il server');
    }
}
