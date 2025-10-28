/* dvr.js - gestione base per telecamere ONVIF */

async function scanCameras() {
    const cameraListDiv = document.getElementById('cameraList');
    cameraListDiv.innerHTML = 'Scansione in corso...';

    // Simulazione di scansione rete per telecamere ONVIF
    setTimeout(() => {
        const cameras = [
            {name: 'Camera 1', url: 'rtsp://192.168.1.101/stream'},
            {name: 'Camera 2', url: 'rtsp://192.168.1.102/stream'}
        ];

        let html = '<ul>';
        cameras.forEach(cam => {
            html += `<li><button onclick="showLive('${cam.url}')">${cam.name}</button></li>`;
        });
        html += '</ul>';

        cameraListDiv.innerHTML = html;
    }, 2000);
}

function showLive(url) {
    const liveDiv = document.getElementById('liveStream');
    liveDiv.innerHTML = `<video width="640" height="480" controls autoplay src="${url}"></video>`;
}
