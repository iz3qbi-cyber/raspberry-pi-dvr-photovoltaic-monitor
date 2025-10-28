async function loadCameras() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            const cameras = config.cameras || [];
            const container = document.getElementById('cameraGrid');
            container.innerHTML = '';
            cameras.forEach((cam, i) => {
                const videoDiv = document.createElement('div');
                videoDiv.classList.add('camera-video');
                videoDiv.innerHTML = `
                    <h3>Telecamera #${i + 1}</h3>
                    <video controls autoplay muted width="320" height="240">
                      <source src="rtsp://${cam.username}:${cam.password}@${cam.ip}:${cam.port}/stream" type="application/x-rtsp" />
                      <p>Il tuo browser non supporta il video RTSP.</p>
                    </video>`;
                container.appendChild(videoDiv);
            });
        } else {
            alert('Errore nel caricamento configurazione telecamere');
        }
    } catch {
        alert('Errore nella comunicazione con il server');
    }
}
