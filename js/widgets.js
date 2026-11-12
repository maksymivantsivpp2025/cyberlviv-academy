/**
 * Асинхронний модуль динамічних інформерів «КіберЛьвів» (ЛР №7)
 * Підключається через <script src="js/widgets.js" async defer></script>
 * 1. Інформер погоди у Львові та Києві (Open-Meteo Live API)
 * 2. Інформер точного часу у Львові та статусу арени (Time.is формат)
 * 3. Інтерактивний конвертер валют для призових фондів та буткемпів
 */
(function () {
  // 1. Точний час у Львові (Europe/Kyiv)
  function updateLvivClock() {
    const timeEl = document.getElementById('lviv-live-time');
    const dateEl = document.getElementById('lviv-live-date');
    const statusEl = document.getElementById('lviv-arena-status');
    if (!timeEl) return;

    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Kyiv',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    timeEl.textContent = timeFormatter.format(now);
    if (dateEl) {
      const formattedDate = dateFormatter.format(now);
      dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

    if (statusEl) {
      const kyivHour = parseInt(
        new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false }).format(now),
        10
      );
      if (kyivHour >= 10 && kyivHour < 21) {
        statusEl.textContent = 'Арена відкрита (10:00–21:00)';
        statusEl.className = 'text-xs font-semibold text-emerald-400';
      } else {
        statusEl.textContent = 'Нічний режим відновлення сну (до 10:00)';
        statusEl.className = 'text-xs font-semibold text-cyber-cyan';
      }
    }
  }

  updateLvivClock();
  setInterval(updateLvivClock, 1000);

  // 2. Динамічний інформер погоди (Львів та Київ) через Open-Meteo API
  async function loadWeatherInformer() {
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=49.8397,50.4501&longitude=24.0297,30.5234&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m&timezone=Europe%2FKyiv'
      );
      if (!res.ok) return;
      const data = await res.json();
      const cities = Array.isArray(data) ? data : [data];

      if (cities[0] && cities[0].current) {
        const c = cities[0].current;
        const tempEl = document.getElementById('weather-lviv-temp');
        const humEl = document.getElementById('weather-lviv-hum');
        const windEl = document.getElementById('weather-lviv-wind');
        const pressEl = document.getElementById('weather-lviv-press');
        if (tempEl) tempEl.textContent = (c.temperature_2m > 0 ? '+' : '') + Math.round(c.temperature_2m) + '°C';
        if (humEl) humEl.textContent = c.relative_humidity_2m + '%';
        if (windEl) windEl.textContent = c.wind_speed_10m + ' м/с';
        if (pressEl) pressEl.textContent = Math.round(c.surface_pressure * 0.75006) + ' мм';
      }

      if (cities[1] && cities[1].current) {
        const c2 = cities[1].current;
        const tempKyiv = document.getElementById('weather-kyiv-temp');
        const humKyiv = document.getElementById('weather-kyiv-hum');
        const windKyiv = document.getElementById('weather-kyiv-wind');
        if (tempKyiv) tempKyiv.textContent = (c2.temperature_2m > 0 ? '+' : '') + Math.round(c2.temperature_2m) + '°C';
        if (humKyiv) humKyiv.textContent = c2.relative_humidity_2m + '%';
        if (windKyiv) windKyiv.textContent = c2.wind_speed_10m + ' м/с';
      }
    } catch (err) {
      // Fallback значення вже присутні в розмітці
    }
  }

  loadWeatherInformer();

  // 3. Інтерактивний конвертер валют (UAH / USD / EUR / PLN)
  const amountInput = document.getElementById('currency-amount');
  const fromSelect = document.getElementById('currency-from');
  const toSelect = document.getElementById('currency-to');
  const resultEl = document.getElementById('currency-result');

  const ratesToUAH = {
    UAH: 1,
    USD: 41.5,
    EUR: 45.2,
    PLN: 10.45
  };

  function recalculateCurrency() {
    if (!amountInput || !fromSelect || !toSelect || !resultEl) return;
    const val = parseFloat(amountInput.value);
    if (isNaN(val) || val < 0) {
      resultEl.textContent = '0.00';
      return;
    }
    const fromRate = ratesToUAH[fromSelect.value] || 1;
    const toRate = ratesToUAH[toSelect.value] || 1;
    const converted = (val * fromRate) / toRate;
    resultEl.textContent = converted.toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ' + toSelect.value;
  }

  if (amountInput && fromSelect && toSelect) {
    amountInput.addEventListener('input', recalculateCurrency);
    fromSelect.addEventListener('change', recalculateCurrency);
    toSelect.addEventListener('change', recalculateCurrency);
    recalculateCurrency();
  }
})();
