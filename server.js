const express = require('express');
const app = express();
const Onvif = require('node-onvif');
const Modbus = require('jsmodbus');
const net = require('net');
const fs = require('fs');

const port = 3000;
const configFilePath = './config.json';

app.use(express.json());
app.use(express.static('public'));

// Discover ONVIF cameras in network
app.get('/api/cameras', async (req, res) => {
  console.log('Ricevuta richiesta GET /api/cameras');
  let devices = [];
  try {
    devices = await Onvif.startProbe();
  } catch (error) {
    console.error('Errore scoperta ONVIF:', error);
  }
  res.json(devices);
});

// Funzione helper per connessione Modbus
async function connectModbus() {
  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket);
  let hvHost = '192.168.1.20';
  let hvPort = 502;
  
  if (fs.existsSync(configFilePath)) {
    const config = JSON.parse(fs.readFileSync(configFilePath));
    if (config.hvHost) hvHost = config.hvHost;
    if (config.hvPort) hvPort = config.hvPort;
  }
  
  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      resolve({ socket, client });
    });
    socket.on('error', reject);
    socket.connect({ host: hvHost, port: hvPort });
  });
}

// API per dati generali inverter Huawei
app.get('/api/huawei-data', async (req, res) => {
  console.log('Ricevuta richiesta GET /api/huawei-data');
  try {
    const { socket, client } = await connectModbus();
    
    try {
      // Registri principali inverter SUN2000-10KTL-M1
      const basicData = await client.readHoldingRegisters(32000, 50); // Dati base inverter
      const powerData = await client.readHoldingRegisters(32064, 20); // Potenze
      const energyData = await client.readHoldingRegisters(32106, 10); // Energie cumulative
      
      const data = {
        // Dati base
        status: basicData.response._body._values[0],
        inputPower: (basicData.response._body._values[14] + (basicData.response._body._values[15] << 16)) / 1000, // kW
        outputPower: (basicData.response._body._values[12] + (basicData.response._body._values[13] << 16)) / 1000, // kW
        
        // Tensioni e correnti
        dcVoltage1: basicData.response._body._values[2] / 10, // V
        dcVoltage2: basicData.response._body._values[4] / 10, // V
        dcCurrent1: basicData.response._body._values[3] / 100, // A
        dcCurrent2: basicData.response._body._values[5] / 100, // A
        
        acVoltageA: basicData.response._body._values[6] / 10, // V
        acCurrentA: basicData.response._body._values[10] / 1000, // A
        
        // Energia giornaliera e totale
        dailyEnergy: energyData.response._body._values[0] / 100, // kWh
        totalEnergy: (energyData.response._body._values[2] + (energyData.response._body._values[3] << 16)) / 100, // kWh
        
        // Temperatura inverter
        temperature: basicData.response._body._values[25] / 10, // °C
        
        timestamp: new Date().toISOString()
      };
      
      res.json(data);
    } catch (e) {
      console.error('Errore lettura Modbus:', e);
      res.status(500).json({ error: 'Errore lettura dati inverter' });
    } finally {
      socket.end();
    }
  } catch (e) {
    console.error('Errore connessione Modbus TCP:', e);
    res.status(500).json({ error: 'Errore connessione inverter' });
  }
});

// API per dati dettagliati pannelli/optimizer
app.get('/api/panels', async (req, res) => {
  console.log('Ricevuta richiesta GET /api/panels');
  try {
    const { socket, client } = await connectModbus();
    
    try {
      const panels = [];
      // SUN2000-10KTL-M1 supporta fino a 2 stringhe con optimizer
      // Registri optimizer iniziano da 37000
      
      for (let string = 0; string < 2; string++) {
        try {
          // Leggi numero di optimizer per stringa
          const optimizerCount = await client.readHoldingRegisters(37000 + string * 100, 1);
          const count = Math.min(optimizerCount.response._body._values[0], 12); // Max 12 per stringa
          
          for (let opt = 0; opt < count; opt++) {
            const baseAddr = 37001 + string * 100 + opt * 4;
            const optData = await client.readHoldingRegisters(baseAddr, 4);
            
            if (optData.response._body._values[0] > 0) { // Se c'è tensione, il pannello è attivo
              panels.push({
                id: `S${string + 1}P${opt + 1}`,
                string: string + 1,
                position: opt + 1,
                voltage: optData.response._body._values[0] / 10, // V
                current: optData.response._body._values[1] / 100, // A
                power: (optData.response._body._values[0] * optData.response._body._values[1]) / 1000, // W
                temperature: optData.response._body._values[2] / 10, // °C
                energy: optData.response._body._values[3] / 100, // kWh giornaliera
                status: optData.response._body._values[0] > 10 ? 'OK' : 'LOW_VOLTAGE'
              });
            }
          }
        } catch (stringError) {
          console.warn(`Errore lettura stringa ${string + 1}:`, stringError);
        }
      }
      
      res.json({
        panels,
        totalPanels: panels.length,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Errore lettura pannelli:', e);
      res.status(500).json({ error: 'Errore lettura dati pannelli' });
    } finally {
      socket.end();
    }
  } catch (e) {
    console.error('Errore connessione Modbus per pannelli:', e);
    res.status(500).json({ error: 'Errore connessione per dati pannelli' });
  }
});

// API per statistiche e costi energetici
app.get('/api/energy-stats', async (req, res) => {
  console.log('Ricevuta richiesta GET /api/energy-stats');
  try {
    const { socket, client } = await connectModbus();
    
    try {
      // Leggi dati energetici mensili/annuali
      const monthlyData = await client.readHoldingRegisters(32106, 20);
      
      // Tariffe Octopus Italia (esempio - da aggiornare con tariffe reali)
      const octopusTariffs = {
        energyRate: 0.25, // €/kWh - tariffa base
        peakRate: 0.35,   // €/kWh - ore di punta
        offPeakRate: 0.18, // €/kWh - ore fuori punta
        standingCharge: 0.45 // €/giorno - quota fissa
      };
      
      const dailyEnergy = monthlyData.response._body._values[0] / 100; // kWh oggi
      const monthlyEnergy = monthlyData.response._body._values[4] / 100; // kWh questo mese
      const yearlyEnergy = monthlyData.response._body._values[6] / 100; // kWh quest'anno
      const totalEnergy = (monthlyData.response._body._values[2] + (monthlyData.response._body._values[3] << 16)) / 100;
      
      // Calcola risparmi (assumendo autoconsumo 70%)
      const selfConsumption = 0.7;
      const dailySavings = dailyEnergy * selfConsumption * octopusTariffs.energyRate;
      const monthlySavings = monthlyEnergy * selfConsumption * octopusTariffs.energyRate;
      const yearlySavings = yearlyEnergy * selfConsumption * octopusTariffs.energyRate;
      
      // Energia venduta alla rete (30% della produzione)
      const dailyExport = dailyEnergy * 0.3;
      const monthlyExport = monthlyEnergy * 0.3;
      const yearlyExport = yearlyEnergy * 0.3;
      const exportRate = 0.08; // €/kWh vendita alla rete
      
      const dailyExportRevenue = dailyExport * exportRate;
      const monthlyExportRevenue = monthlyExport * exportRate;
      const yearlyExportRevenue = yearlyExport * exportRate;
      
      const stats = {
        production: {
          today: dailyEnergy,
          thisMonth: monthlyEnergy,
          thisYear: yearlyEnergy,
          total: totalEnergy
        },
        economics: {
          daily: {
            production: dailyEnergy,
            savings: dailySavings,
            exportRevenue: dailyExportRevenue,
            totalBenefit: dailySavings + dailyExportRevenue
          },
          monthly: {
            production: monthlyEnergy,
            savings: monthlySavings,
            exportRevenue: monthlyExportRevenue,
            totalBenefit: monthlySavings + monthlyExportRevenue
          },
          yearly: {
            production: yearlyEnergy,
            savings: yearlySavings,
            exportRevenue: yearlyExportRevenue,
            totalBenefit: yearlySavings + yearlyExportRevenue
          }
        },
        tariffs: octopusTariffs,
        timestamp: new Date().toISOString()
      };
      
      res.json(stats);
    } catch (e) {
      console.error('Errore lettura statistiche:', e);
      res.status(500).json({ error: 'Errore lettura statistiche energetiche' });
    } finally {
      socket.end();
    }
  } catch (e) {
    console.error('Errore connessione per statistiche:', e);
    res.status(500).json({ error: 'Errore connessione per statistiche' });
  }
});

// API per leggere configurazioni
app.get('/api/config', (req, res) => {
  console.log('Ricevuta richiesta GET /api/config');
  if (fs.existsSync(configFilePath)) {
    const configData = fs.readFileSync(configFilePath);
    console.log('Configurazione letta:', configData.toString());
    res.json(JSON.parse(configData));
  } else {
    console.log('File config.json non trovato, uso valori vuoti');
    res.json({ 
      cameras: [],
      hvHost: '192.168.1.20', 
      hvPort: '502',
      octopusTariffs: {
        energyRate: 0.25,
        peakRate: 0.35,
        offPeakRate: 0.18,
        standingCharge: 0.45
      }
    });
  }
});

// API per salvare configurazioni
app.post('/api/config', (req, res) => {
  console.log('Ricevuta richiesta POST /api/config con body:', req.body);
  const config = req.body;
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  res.status(200).send('Configurazione salvata');
});

app.listen(port, () => {
  console.log(`Backend Node.js in ascolto su http://localhost:${port}`);
});