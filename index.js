const express = require('express');
const axios = require('axios');
const ical = require('node-ical');  // <--- cambiamo il pacchetto
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

const calendars = [
  {
    name: 'Rossana',
    url: 'https://p110-caldav.icloud.com/published/2/Mjc0ODg1NjEwMjc0ODg1NjIWbHgcjE98RSUi3-8SOKE4rDI-dJVKFHconaX796bJC0MqSx_n2wdeZkoVi3Fyk0_n4LVAsn57oWA3WjFtrco'
  }
];

async function fetchCalendar(url) {
  try {
    const httpsUrl = url.replace('webcal://', 'https://');
    const response = await axios.get(httpsUrl);
    const data = await ical.async.parseICS(response.data); // con node-ical usiamo async.parseICS
    return Object.values(data).filter(event => event.type === 'VEVENT');
  } catch (error) {
    console.error('Errore nel fetch del calendario:', error.message);
    return [];
  }
}

app.get('/availability', async (req, res) => {
  const { date, time } = req.query;
  if (!date || !time) {
    return res.status(400).json({ error: 'Parametri date e time obbligatori!' });
  }

  const requestedDateTime = new Date(`${date}T${time}:00`);
  const slotDurationMinutes = 30;
  const slotEndTime = new Date(requestedDateTime.getTime() + slotDurationMinutes * 60000);

  const availability = [];

  for (const calendar of calendars) {
    const events = await fetchCalendar(calendar.url);

    const isBusy = events.some(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);

      return (
        (requestedDateTime >= start && requestedDateTime < end) ||
        (slotEndTime > start && slotEndTime <= end)
      );
    });

    if (!isBusy) {
      availability.push(calendar.name);
    }
  }

  res.json({ date, time, availableCollaborators: availability });
});

app.listen(port, () => {
  console.log(`✅ Agencee backend attivo su http://localhost:${port}`);
});
