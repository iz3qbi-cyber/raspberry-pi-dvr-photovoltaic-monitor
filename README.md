# Sistema di Monitoraggio DVR e Fotovoltaico Raspberry Pi

## Descrizione
Sistema completo per il monitoraggio di telecamere ONVIF e impianto fotovoltaico Huawei SUN2000-10KTL-M1 su Raspberry Pi, con analisi dettagliata pannello per pannello e calcolo automatico dei costi energetici basato sulle tariffe Octopus Italia.

## Caratteristiche Principali

### 📹 Monitoraggio DVR ONVIF
- Supporto per multiple telecamere ONVIF (6-8 telecamere)
- Configurazione individuale per ogni telecamera (IP, porta, credenziali)
- Visualizzazione simultanea di tutti i feed video
- Interface web responsive per controllo remoto

### ⚡ Monitoraggio Fotovoltaico Avanzato
- **Inverter Huawei SUN2000-10KTL-M1**: Monitoraggio completo via Modbus TCP
- **Analisi Panel-Level**: Visualizzazione dettagliata di ogni singolo pannello/optimizer
- **Statistiche Energetiche**: Dati giornalieri, mensili e annuali
- **Calcolo Costi**: Integrazione automatica con tariffe Octopus Italia
- **Dashboard Interattivo**: Vista griglia e tabella per i pannelli

### 💰 Analisi Economica
- Calcolo risparmio energetico in tempo reale
- Stima ricavi da vendita energia alla rete
- Proiezioni economiche giornaliere, mensili e annuali
- Integrazione tariffe Octopus Italia (aggiornabili)

## Installazione

### Prerequisiti
- Raspberry Pi 4 con Raspberry Pi OS
- Node.js 14+ installato
- Connessione di rete all'inverter Huawei e alle telecamere ONVIF

### Installazione Rapida

```bash
# 1. Clona il repository
git clone https://github.com/iz3qbi-cyber/raspberry-pi-dvr-photovoltaic-monitor.git
cd raspberry-pi-dvr-photovoltaic-monitor

# 2. Installa le dipendenze
npm install

# 3. Avvia il server
npm start
```

### Installazione per Sviluppo

```bash
# Installa nodemon per il riavvio automatico
npm run install-global
npm run dev
```

## Configurazione

### Accesso Web
Dopo l'avvio, accedi all'interfaccia web:
```
http://[IP_RASPBERRY_PI]:3000
```

### Configurazione Iniziale
1. Vai su `http://[IP_RASPBERRY_PI]:3000/config.html`
2. **Telecamere**: Aggiungi le telecamere ONVIF con IP, porta, utente e password
3. **Inverter Huawei**: Configura IP e porta Modbus TCP (default: 192.168.1.20:502)
4. **Tariffe Octopus**: Le tariffe sono preconfigurate ma modificabili

## API Endpoints

### Telecamere
- `GET /api/cameras` - Scoperta automatica telecamere ONVIF
- `GET /api/config` - Lettura configurazione
- `POST /api/config` - Salvataggio configurazione

### Fotovoltaico
- `GET /api/huawei-data` - Dati generali inverter
- `GET /api/panels` - Dati dettagliati di ogni pannello
- `GET /api/energy-stats` - Statistiche energetiche e calcoli economici

## Struttura dei Dati

### Dati Inverter
```json
{
  "status": 1,
  "inputPower": 8.5,
  "outputPower": 8.2,
  "dcVoltage1": 380.5,
  "dcCurrent1": 12.5,
  "dailyEnergy": 45.2,
  "totalEnergy": 15847.3,
  "temperature": 42.1
}
```

### Dati Pannelli
```json
{
  "panels": [
    {
      "id": "S1P1",
      "string": 1,
      "position": 1,
      "voltage": 31.2,
      "current": 9.8,
      "power": 305.8,
      "temperature": 35.4,
      "energy": 1.85,
      "status": "OK"
    }
  ],
  "totalPanels": 24
}
```

### Statistiche Economiche
```json
{
  "production": {
    "today": 45.2,
    "thisMonth": 1247.8,
    "thisYear": 8542.1
  },
  "economics": {
    "daily": {
      "savings": 7.91,
      "exportRevenue": 1.08,
      "totalBenefit": 8.99
    }
  }
}
```

## Registri Modbus Huawei SUN2000-10KTL-M1

### Registri Principali (32000+)
- **32000-32049**: Stato inverter e dati base
- **32064-32083**: Dati di potenza AC/DC
- **32106-32115**: Energie cumulative

### Registri Optimizer (37000+)
- **37000**: Numero optimizer per stringa
- **37001+**: Dati dettagliati per ogni optimizer (tensione, corrente, potenza, temperatura)

## Tariffe Octopus Italia (Configurabili)

- **Tariffa base**: €0.25/kWh
- **Ore punta**: €0.35/kWh
- **Ore fuori punta**: €0.18/kWh
- **Quota fissa giornaliera**: €0.45/giorno
- **Vendita alla rete**: €0.08/kWh

## Interfaccia Web

### 🏠 Home (`/`)
Pagina principale con overview del sistema

### 📹 DVR (`/dvr.html`)
Monitoraggio telecamere ONVIF con visualizzazione simultanea di tutti i feed

### ⚡ Fotovoltaico (`/photovoltaic.html`)
Dashboard completo con:
- Stato generale inverter
- Statistiche energetiche e costi
- Vista griglia pannelli (interattiva)
- Vista tabella pannelli (dettagliata)
- Aggiornamento automatico ogni 30 secondi

### ⚙️ Configurazione (`/config.html`)
- Gestione telecamere multiple
- Configurazione inverter Huawei
- Impostazione tariffe energetiche

## Gestione del Servizio

### Avvio Manuale
```bash
node server.js
```

### Avvio Automatico con PM2
```bash
# Installa PM2
npm install -g pm2

# Avvia il servizio
pm2 start server.js --name "photovoltaic-monitor"

# Configurazione autostart
pm2 startup
pm2 save
```

### Avvio Automatico con systemd
Crea il file `/etc/systemd/system/photovoltaic-monitor.service`:

```ini
[Unit]
Description=Photovoltaic Monitor
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/raspberry-pi-dvr-photovoltaic-monitor
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Poi:
```bash
sudo systemctl daemon-reload
sudo systemctl enable photovoltaic-monitor
sudo systemctl start photovoltaic-monitor
```

## Troubleshooting

### Errori Comuni

1. **Errore connessione Modbus**:
   - Verifica IP e porta inverter
   - Controlla connessione di rete
   - Assicurati che Modbus TCP sia abilitato sull'inverter

2. **Telecamere non trovate**:
   - Verifica che le telecamere siano sulla stessa rete
   - Controlla credenziali di accesso
   - Verifica supporto ONVIF sulla telecamera

3. **Pannelli non rilevati**:
   - Verifica che gli optimizer siano configurati
   - Controlla i registri Modbus nel range 37000+
   - Assicurati che l'inverter supporti il monitoraggio panel-level

### Log e Debug
I log del server vengono visualizzati nella console. Per debug avanzato:

```bash
# Con maggiore verbosità
DEBUG=* node server.js
```

## Contributi
Contributi benvenuti! Per segnalazioni bug o richieste di funzionalità, apri una issue su GitHub.

## Licenza
MIT License - vedi file LICENSE per dettagli

## Supporto
Per supporto tecnico o domande, apri una issue nel repository GitHub.

---

**Versione**: 2.0.0  
**Ultimo aggiornamento**: Ottobre 2025  
**Compatibilità**: Raspberry Pi 4, Node.js 14+, Huawei SUN2000-10KTL-M1