// server.js - backend Node.js base per Raspberry Pi

const express = require('express');
const Onvif = require('node-onvif');
const Modbus = require('jsmodbus');
const net = require('net');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// Discover ONVIF cameras in network
app.get('/api/cameras', async (req, res) => {
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
  try {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket);
    const options = { host: '192.168.1.50', port: 502 };

    socket.on('connect', async () => {
      try {
        // Leggi 10 registri esempio a partire da indirizzo 0
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

app.listen(port, () => {
  console.log(`Backend Node.js in ascolto su http://localhost:${port}`);
});
