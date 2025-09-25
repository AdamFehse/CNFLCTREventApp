// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed:', registrationError);
      });
  });
}

// PWA Install Prompt
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
  console.log('beforeinstallprompt fired');
});

installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
    installBtn.style.display = 'none';
  }
});

// Notification Permission
const subscribeBtn = document.getElementById('subscribe');

subscribeBtn.addEventListener('click', async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      subscribeBtn.textContent = 'Notifications Enabled';
      subscribeBtn.disabled = true;
      new Notification('Office Events', {
        body: 'You will now receive event notifications!',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" fill="%230066cc"/%3E%3Ctext x="96" y="110" text-anchor="middle" font-size="72" fill="white" font-family="Arial"%3EE%3C/text%3E%3C/svg%3E'
      });
    } else {
      alert('Notifications permission denied');
    }
  } else {
    alert('This browser does not support notifications');
  }
});

// Check if notifications are already enabled
if ('Notification' in window && Notification.permission === 'granted') {
  subscribeBtn.textContent = 'Notifications Enabled';
  subscribeBtn.disabled = true;
}

// App functionality
class EventsApp {
  constructor() {
    this.eventsContainer = document.getElementById('events');
    this.refreshBtn = document.getElementById('refresh');
    this.init();
  }

  init() {
    this.loadEvents();
    this.refreshBtn.addEventListener('click', () => this.loadEvents());
    
    // Auto-refresh every 5 minutes
    setInterval(() => this.loadEvents(), 5 * 60 * 1000);
  }

  async loadEvents() {
    try {
      this.eventsContainer.innerHTML = '<p class="loading">Loading events...</p>';
      
      const response = await fetch('events.json', {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.renderEvents(data.events);
      
    } catch (error) {
      console.error('Error loading events:', error);
      this.eventsContainer.innerHTML = `
        <div class="error">
          <strong>Error loading events:</strong> ${error.message}
          <br>Please check your connection and try again.
        </div>
      `;
    }
  }

  renderEvents(events) {
    if (!events || events.length === 0) {
      this.eventsContainer.innerHTML = '<p class="loading">No events scheduled.</p>';
      return;
    }

    // Sort events by date
    const sortedEvents = events.sort((a, b) => {
      return new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time);
    });

    const eventsHTML = sortedEvents.map(event => this.createEventCard(event)).join('');
    this.eventsContainer.innerHTML = eventsHTML;
  }

  createEventCard(event) {
    const eventDate = new Date(event.date + ' ' + event.time);
    const now = new Date();
    const isPastEvent = eventDate < now;
    
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const spotsLeft = event.capacity - event.registered;
    const capacityClass = spotsLeft <= 5 ? 'text-warning' : '';
    const isFullyBooked = spotsLeft <= 0;

    return `
      <div class="event-card ${isPastEvent ? 'opacity-50' : ''}">
        <div class="event-title">${this.escapeHtml(event.title)}</div>
        <div class="event-datetime">${formattedDate} at ${formattedTime}</div>
        <div class="event-location">📍 ${this.escapeHtml(event.location)}</div>
        <div class="event-description">${this.escapeHtml(event.description)}</div>
        
        <div class="event-registration">
          ${!isPastEvent && !isFullyBooked ? `
            <a href="${event.registrationUrl}" 
               target="_blank" 
               class="registration-button"
               rel="noopener noreferrer">
              Register Now
            </a>
          ` : `
            <span class="registration-button" style="background: #6c757d; cursor: not-allowed;">
              ${isPastEvent ? 'Event Passed' : 'Fully Booked'}
            </span>
          `}
          
          <div class="capacity-info ${capacityClass}">
            ${event.registered}/${event.capacity} registered
            ${!isPastEvent && !isFullyBooked ? `<br><strong>${spotsLeft} spots left</strong>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new EventsApp();
});


console.log('DEBUG: New app.js version loaded with polling');

// --- ntfy UI wiring: ensure handlers attach after DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
  const ntfyTopicEl = document.getElementById('ntfyTopic');
  const ntfyCreateBtn = document.getElementById('ntfyCreate');
  const ntfySubscribeBtn = document.getElementById('ntfySubscribe');
  const ntfyUnsubscribeBtn = document.getElementById('ntfyUnsubscribe');
  const ntfyStatus = document.getElementById('ntfyStatus');
  const ntfyLog = document.getElementById('ntfyLog');

  function randomTopic(){ return 'office-events-' + Math.random().toString(36).slice(2,8); }

  if(ntfyCreateBtn){
    ntfyCreateBtn.addEventListener('click', () => { if(ntfyTopicEl) ntfyTopicEl.value = randomTopic(); });
  }

  if(ntfySubscribeBtn){
    ntfySubscribeBtn.addEventListener('click', async () => {
      console.log('Manual click handler working');
      const topic = ntfyTopicEl && ntfyTopicEl.value && ntfyTopicEl.value.trim();
      if(!topic){ if(ntfyStatus) ntfyStatus.textContent = 'Enter a topic first'; return }

      if(Notification.permission !== 'granted'){
        const p = await Notification.requestPermission();
        if(p !== 'granted'){ if(ntfyStatus) ntfyStatus.textContent = 'Notifications permission required'; return }
      }

      // clear any existing poll
      if(window.ntfyPollInterval){ clearInterval(window.ntfyPollInterval); window.ntfyPollInterval = null }

      if(ntfyStatus) ntfyStatus.textContent = 'Connected to ' + topic + ' (polling)';

      let lastSeenTime = Math.floor(Date.now()/1000);
      window.ntfyPollInterval = setInterval(async () => {
        try{
          const resp = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=${lastSeenTime}`, { method: 'GET' });
          if(!resp.ok) return;
          const text = await resp.text();
          if(!text.trim()) return;
          const messages = text.trim().split('\n');
          messages.forEach(line => {
            try{
              const data = JSON.parse(line);
              // Only process messages newer than lastSeenTime
              if(data.message && data.time > lastSeenTime){
                const title = data.title || 'Office Event';
                new Notification(title, { body: data.message });
                console.log('✅ Notification shown:', title, data.message);
                if(ntfyLog){
                  if(ntfyLog.firstChild && ntfyLog.firstChild.textContent === 'No messages yet') ntfyLog.innerHTML = '';
                  const div = document.createElement('div');
                  div.textContent = `[${new Date(data.time*1000).toLocaleTimeString()}] ${title}: ${data.message}`;
                  ntfyLog.appendChild(div);
                  ntfyLog.scrollTop = ntfyLog.scrollHeight;
                }
                // update lastSeenTime so we don't show this message again
                if (data.time && data.time > lastSeenTime) {
                  lastSeenTime = data.time;
                }
              }
            }catch(e){ /* ignore invalid json */ }
          });
        }catch(err){
          console.warn('ntfy polling error', err);
          if(ntfyStatus) ntfyStatus.textContent = 'Connection error - retrying...';
        }
      }, 3000);
    });
  }

  if(ntfyUnsubscribeBtn){
    ntfyUnsubscribeBtn.addEventListener('click', () => {
      if(window.ntfyPollInterval){ clearInterval(window.ntfyPollInterval); window.ntfyPollInterval = null }
      if(ntfyStatus) ntfyStatus.textContent = 'Disconnected';
      if(ntfyLog){ const p = document.createElement('div'); p.textContent = `[${new Date().toLocaleTimeString()}] Unsubscribed`; ntfyLog.appendChild(p); ntfyLog.scrollTop = ntfyLog.scrollHeight; }
    });
  }
});

