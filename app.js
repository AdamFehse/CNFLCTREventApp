const eventsEl = document.getElementById('events');
const refreshBtn = document.getElementById('refresh');
const subscribeBtn = document.getElementById('subscribe');
const installBtn = document.getElementById('installBtn');
// small status element to show installability hints (create if missing)
let installStatus = document.getElementById('installStatus');
if(!installStatus){
  installStatus = document.createElement('div');
  installStatus.id = 'installStatus';
  installStatus.style.fontSize = '0.9rem';
  installStatus.style.color = '#444';
  installStatus.style.marginLeft = '8px';
  if(installBtn && installBtn.parentNode) installBtn.parentNode.appendChild(installStatus);
}

async function fetchEvents(){
  eventsEl.innerHTML = '<p class="loading">Loading events…</p>';
  try{
    const res = await fetch('events.json',{cache:'no-cache'});
    if(!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    renderEvents(data.events || []);
  }catch(err){
    console.warn('Fetch events failed',err);
    const cached = await caches.match('events.json');
    if(cached){
      const data = await cached.json();
      renderEvents(data.events || []);
    } else {
      eventsEl.innerHTML = '<p class="loading">Unable to load events.</p>';
    }
  }
}

function renderEvents(list){
  if(!list.length) { eventsEl.innerHTML='<p class="loading">No upcoming events.</p>'; return }
  eventsEl.innerHTML = '';
  list.forEach(ev => {
    const div = document.createElement('article');
    div.className = 'event';
    div.innerHTML = `
      <h3>${escapeHtml(ev.title)}</h3>
      <div class="meta">${escapeHtml(ev.date)} · ${escapeHtml(ev.location || '')}</div>
      <div class="desc">${escapeHtml(ev.description || '')}</div>
      <a class="register" href="${ev.url}" target="_blank" rel="noopener">Register</a>
    `;
    eventsEl.appendChild(div);
  });
}

function escapeHtml(s){
  if(!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

refreshBtn.addEventListener('click', () => fetchEvents());

subscribeBtn.addEventListener('click', async () => {
  // For now just prompt permission — actual push wiring is separate
  const p = await Notification.requestPermission();
  if(p === 'granted') subscribeBtn.textContent = 'Notifications Enabled';
});

// Register service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(() => console.log('SW registered'))
}

fetchEvents();

// Handle PWA install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent automatic prompt
  e.preventDefault();
  deferredPrompt = e;
  if(installBtn){
    installBtn.style.display = 'inline-block';
    installBtn.addEventListener('click', async () => {
      // If for some reason the prompt isn't available, show helpful message
      if(!deferredPrompt){
        alert('Install prompt not available. Make sure you are running the page from localhost or HTTPS and that your browser supports PWA installation.');
        return;
      }
      installBtn.style.display = 'none';
      try{
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log('userChoice', choice);
      }catch(err){
        console.warn('Install prompt failed', err);
        alert('Install prompt failed — check the console for details.');
      }
      deferredPrompt = null;
    });
    installStatus.textContent = 'Install available';
  }
});

window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  if(installStatus) installStatus.textContent = 'App installed';
});

// Helpful hint if beforeinstallprompt never fired
setTimeout(() => {
  if(!deferredPrompt){
    if(installStatus) installStatus.textContent = 'Install not available — serve over localhost/HTTPS and ensure manifest + service worker are valid';
    console.info('beforeinstallprompt not fired — check manifest, service worker, and that you are on localhost or HTTPS.');
  }
}, 1500);
