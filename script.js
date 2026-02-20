const DATA_FILENAME = "data_carte_3A_2026.csv";

const map = L.map("map").setView([46.603354, 1.888334], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// --- CONFIGURATION D'UNE ICÔNE PERSONNALISÉE ---
const customIcon = L.icon({
  iconUrl:
    "https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png", // Vous pouvez mettre votre propre URL d'image
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -35],
});

async function loadCSV() {
  try {
    const response = await fetch(DATA_FILENAME);
    if (!response.ok) throw new Error("Erreur de chargement");
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error(error);
    return [];
  }
}

function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",");
  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(",");
      if (values.length < headers.length) return null;
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index] ? values[index].trim() : "";
        return obj;
      }, {});
    })
    .filter((row) => row !== null);
}

async function loadCities() {
  const data = await loadCSV();
  const cities = {};

  data.forEach((row) => {
    const cityName = row.Ville_Nettoyee;
    const key = cityName.toLowerCase();
    if (!cities[key]) {
      cities[key] = {
        name: cityName,
        lat: parseFloat(row.Latitude),
        lng: parseFloat(row.Longitude),
        residents: [],
      };
    }
    // Stockage des infos détaillées pour la recherche
    cities[key].residents.push({
      fullname: `${row.Prenom} ${row.Nom}`,
      company: row.Entreprise,
      endDate: row.Date_Fin,
      display: `• ${row.Prenom} ${row.Nom} (<b>${row.Entreprise}</b> ${row.Date_Fin ? "- jusqu'au " + row.Date_Fin : ""})`,
    });
  });
  return Object.values(cities);
}

let cityMarkers = [];

loadCities().then((cities) => {
  cities.forEach((city) => {
    const popupContent = `
            <div style="font-family: 'Inter', sans-serif;">
                <b style="color: #2563eb; font-size: 15px;">${city.name}</b><hr>
                <div style="margin-top:8px; font-size:13px; line-height:1.4; color: #334155;">
                    ${city.residents.map((r) => r.display).join("<br>")}
                </div>
            </div>`;

    // Utilisation de l'icône personnalisée ici
    const marker = L.marker([city.lat, city.lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(popupContent);

    cityMarkers.push({
      name: city.name.toLowerCase(),
      residents: city.residents,
      marker,
    });
  });
});

function toggleMenu() {
  document.getElementById("menu").classList.toggle("open");
}

document.getElementById("search").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  if (query.length > 1) {
    cityMarkers.forEach((city) => {
      // Chercher si le nom de la ville correspond
      if (city.name.includes(query)) {
        const li = document.createElement("li");
        li.innerHTML = `📍 <b>VILLE : ${city.name.toUpperCase()}</b>`;
        li.onclick = () => selectLocation(city);
        suggestions.appendChild(li);
      }

      // Chercher dans les résidents (Nom ou Entreprise)
      city.residents.forEach((res) => {
        if (
          res.fullname.toLowerCase().includes(query) ||
          res.company.toLowerCase().includes(query)
        ) {
          const li = document.createElement("li");
          li.innerHTML = `👤 ${res.fullname} <br><small>🏢 ${res.company} (${city.name})</small>`;
          li.onclick = () => selectLocation(city);
          suggestions.appendChild(li);
        }
      });
    });
  }
});

function selectLocation(city) {
  map.setView(city.marker.getLatLng(), 11);
  city.marker.openPopup();
  if (window.innerWidth < 768) toggleMenu();
}
