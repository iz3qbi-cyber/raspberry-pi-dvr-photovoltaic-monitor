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

// Example Modbus TCP client connection to Huawei inverter/storage
app.get('/api/huawei-data', async (req, res) => {
  console.log('Ricevuta richiesta GET /api/huawei-data');
  try {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket);
    let hvHost = '192.168.1.50';
    let hvPort = 502;
    if (fs.existsSync(configFilePath)) {
      const config = JSON.parse(fs.readFileSync(configFilePath));
      if (config.hvHost) hvHost = config.hvHost;
      if (config.hvPort) hvPort = config.hvPort;
    }
    const options = { host: hvHost, port: hvPort };
    socket.on('connect', async () => {
      try {
        const response = await client.readHoldingRegisters(0, 10);
        res.json(response.response._body._values);
      } catch (e) {
        console.error('Errore lettura Modbus:', e);
        res.status(500).send('Errore lettura Modbus');
      } finally {
        socket.end();
      }
    });
    socket.connect(options);
  } catch (e) {
    console.error('Errore Modbus TCP:', e);
    res.status(500).send('Errore Modbus TCP');
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
    res.json({ cameraIP: '', cameraPort: '', hvHost: '', hvPort: '' });
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
