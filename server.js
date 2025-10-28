const fs = require('fs');
const configFilePath = './config.json';

// API per leggere configurazioni
app.get('/api/config', (req, res) => {
  if (fs.existsSync(configFilePath)) {
    const configData = fs.readFileSync(configFilePath);
    res.json(JSON.parse(configData));
  } else {
    res.json({ cameraIP: '', cameraPort: '', hvHost: '', hvPort: '' });
  }
});

// API per salvare configurazioni
app.post('/api/config', (req, res) => {
  const config = req.body;
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  res.status(200).send('Configurazione salvata');
});
