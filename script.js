DATA_FILENAME = 'data_carte_3A_2026.csv'

// Fonction pour charger et parser le fichier CSV
async function loadCSV() {
    try {
        const response = await fetch(DATA_FILENAME);
        if (!response.ok) {
            throw new Error('Erreur lors du chargement du fichier CSV');
        }
        const csvText = await response.text();
        console.log('CSV chargé avec succès');
        return parseCSV(csvText);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Impossible de charger le fichier CSV.');
        return [];
    }
}

// Fonction pour parser le texte CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
        const values = line.split(',');
        if (values.length !== headers.length) {
            console.warn('Ligne ignorée en raison d\'un nombre incorrect de valeurs:', line);
            return null;
        }
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index].trim();
            return obj;
        }, {});
    }).filter(row => row !== null); // Filtrer les lignes nulles
    console.log('CSV parsé avec succès');
    return data;
}

// Fonction pour charger les données des villes à partir du CSV
async function loadCities() {
    const data = await loadCSV();
    const cities = {};

    for (const row of data) {
        const cityName = row.Ville_Nettoyee.toLowerCase();
        if (!cities[cityName]) {
            cities[cityName] = {
                name: cityName,
                lat: parseFloat(row.Latitude),
                lng: parseFloat(row.Longitude),
                residents: []
            };
        }
        if (row.Date_Fin){
            cities[cityName].residents.push(`${row.Prenom} ${row.Nom} (${row.Entreprise} jusqu'au ${row.Date_Fin})`);
        }
        else 
        {
            cities[cityName].residents.push(`${row.Prenom} ${row.Nom} (${row.Entreprise})`);
        }
    }

    console.log('Données des villes chargées avec succès');
    return Object.values(cities);
}

// Initialiser la carte centrée sur la France
const map = L.map('map').setView([46.603354, 1.888334], 6);

// Ajouter une couche de tuiles OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Charger les villes et ajouter des marqueurs
let cityMarkers = [];

loadCities().then(cities => {
    cities.forEach(city => {
        const marker = L.marker([city.lat, city.lng])
            .addTo(map)
            .bindPopup(`<b>${city.name.charAt(0).toUpperCase() + city.name.slice(1)}</b><br>En stage ici : <br> ${city.residents ? city.residents.join(',<br>') : 'Aucun résident listé'}`);

        // Ouvrir la popup au clic
        marker.on('click', function() {
            marker.openPopup();
        });

        cityMarkers.push({
            name: city.name.toLowerCase(),
            residents: city.residents ? city.residents.map(resident => resident.toLowerCase()) : [],
            marker
        });
    });

    console.log('Marqueurs de villes ajoutés avec succès');
});

// Fonction pour afficher/masquer le menu
function toggleMenu() {
    const menu = document.getElementById("menu");
    menu.classList.toggle("open");
}

// Gestion de la recherche et centrage sur la ville trouvée
document.getElementById('search').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const suggestions = document.getElementById('suggestions');
    suggestions.innerHTML = ''; // Vider les suggestions

    if (query.length > 2) {
        const filteredCities = cityMarkers.filter(city => 
            city.name.includes(query) || 
            city.residents.some(resident => resident.includes(query))
        );

        // Vérifier si la recherche correspond à un résident
        const isResidentSearch = filteredCities.some(city => 
            city.residents.some(resident => resident.includes(query))
        );

        filteredCities.forEach(city => {
            // Afficher la ville uniquement si la recherche correspond au nom de la ville
            if (!isResidentSearch && city.name.includes(query)) {
                const cityLi = document.createElement('li');
                cityLi.textContent = city.name.charAt(0).toUpperCase() + city.name.slice(1);
                cityLi.onclick = () => {
                    city.marker.openPopup();
                    map.setView(city.marker.getLatLng(), 10);
                    document.getElementById('search').value = city.name;
                    suggestions.innerHTML = ''; // Cacher les suggestions
                };
                suggestions.appendChild(cityLi);
            }

            // Afficher les résidents correspondants
            city.residents.forEach(resident => {
                if (resident.includes(query)) {
                    const residentLi = document.createElement('li');
                    residentLi.textContent = `${resident} (${city.name.charAt(0).toUpperCase() + city.name.slice(1)})`;
                    residentLi.onclick = () => {
                        city.marker.openPopup();
                        map.setView(city.marker.getLatLng(), 10);
                        document.getElementById('search').value = city.name;
                        suggestions.innerHTML = ''; // Cacher les suggestions
                    };
                    suggestions.appendChild(residentLi);
                }
            });
        });
    }
});