let myMap;
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id');
const markersData = urlParams.get('markers');

console.log("User ID from URL:", userId);

ymaps.ready(init);

function init() {
    // Инициализация карты
    myMap = new ymaps.Map('map', {
        center: [46.347, 48.033], // Центр на Астрахань
        zoom: 12,
        controls: ['geolocationControl', 'zoomControl', 'typeSelector']
    }, {
        searchControlProvider: 'yandex#search'
    });

    myMap.behaviors.enable(['scrollZoom']);

    // Загрузка маркеров из БД
    if (markersData) {
        try {
            const markers = JSON.parse(decodeURIComponent(markersData));
            addMarkersToMap(markers);
        } catch (e) {
            console.error("Ошибка загрузки маркеров:", e);
        }
    }

    // Определение местоположения пользователя
    locateUser(ymaps.geolocation);

    // Обработчик клика по карте
    myMap.events.add('click', handleMapClick);

    // Обработчик поиска
    document.getElementById("search-button").addEventListener("click", handleSearch);
}

// Добавление маркеров на карту
function addMarkersToMap(markers) {
    markers.forEach(marker => {
        const coords = [marker.latitude, marker.longitude];
        
        new ymaps.Placemark(coords, {
            balloonContent: `
                <div class="placemark-balloon">
                    <strong>${marker.label || 'Метка'}</strong>
                    <br>Широта: ${coords[0].toFixed(6)}
                    <br>Долгота: ${coords[1].toFixed(6)}
                    <button class="btn-bookmark" onclick="addToFavorites(${marker.id}, ${userId})">
                        ★ Добавить в закладки
                    </button>
                </div>
            `,
            hintContent: marker.label || 'Метка'
        }, {
            preset: 'islands#blueDotIcon',
            balloonCloseButton: true
        }).addTo(myMap);
    });
}

// Обработчик клика по карте
function handleMapClick(e) {
    const coords = e.get('coords');
    const formattedCoords = coords.map(coord => coord.toFixed(6)).join(', ');
    
    ymaps.geocode(coords).then(function (res) {
        const firstGeoObject = res.geoObjects.get(0);
        if (!firstGeoObject) {
            alert("Не удалось определить объект по координатам");
            return;
        }

        const address = firstGeoObject.getAddressLine();
        const name = firstGeoObject.getLocalities().join(', ') || "Неизвестное место";

        const placemark = new ymaps.Placemark(coords, {
            balloonContent: `
                <div class="placemark-balloon">
                    <strong>${name}</strong>
                    <br>${address}
                    <br><strong>Координаты:</strong> ${formattedCoords}
                    ${userId ? `
                    <button class="btn-bookmark" onclick="addToFavorites(null, ${userId}, ${JSON.stringify({
                        coords: coords,
                        name: name,
                        address: address
                    })})">
                        ★ Добавить в закладки
                    </button>
                    ` : ''}
                </div>
            `
        }, {
            preset: 'islands#blueAirportCircleIcon',
            draggable: false
        });

        myMap.geoObjects.add(placemark);
        placemark.balloon.open();
        
        placemark.balloon.events.add('close', function() {
            myMap.geoObjects.remove(placemark);
        });
    });
}

// Обработчик поиска
function handleSearch() {
    const query = document.getElementById("search-input").value.trim();
    if (!query) {
        alert("Введите запрос для поиска.");
        return;
    }

    ymaps.geocode(query).then(function (res) {
        if (!res || res.geoObjects.getLength() === 0) {
            alert("Ничего не найдено");
            return;
        }

        const firstGeoObject = res.geoObjects.get(0);
        if (!firstGeoObject.geometry) {
            alert("Объект найден, но координаты отсутствуют.");
            return;
        }

        const coords = firstGeoObject.geometry.getCoordinates();
        const formattedCoords = coords.map(coord => coord.toFixed(6)).join(', ');
        const name = firstGeoObject.properties.get('name');
        const description = firstGeoObject.properties.get('description');
        const address = firstGeoObject.getAddressLine();

        myMap.geoObjects.removeAll();

        const placemark = new ymaps.Placemark(coords, {
            balloonContentHeader: `<strong>${name}</strong>`,
            balloonContentBody: (description || '') + `<br><strong>Координаты:</strong> ${formattedCoords}`,
            balloonContentFooter: address,
            hintContent: name
        }, {
            preset: 'islands#blueDotIconWithCaption',
            openBalloonOnClick: true
        });

        myMap.geoObjects.add(placemark);
        myMap.setCenter(coords, 17);
        placemark.balloon.open();
    }).catch(function (error) {
        console.error("Ошибка геокодера:", error);
        alert("Произошла ошибка при поиске.");
    });
}

// Определение местоположения
function locateUser(geolocation) {
    // По IP
    geolocation.get({
        provider: 'yandex',
        mapStateAutoApply: true
    }).then(function (result) {
        result.geoObjects.options.set('preset', 'islands#redCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение (по IP)'
        });
        myMap.geoObjects.add(result.geoObjects);
    });

    // По GPS/браузеру
    geolocation.get({
        provider: 'browser',
        mapStateAutoApply: false
    }).then(function (result) {
        result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение (по GPS/браузеру)'
        });
        myMap.geoObjects.add(result.geoObjects);

        const coords = result.geoObjects.get(0).geometry.getCoordinates();
        myMap.setCenter(coords, 15, { duration: 300 });
    });
}

// Функция добавления в избранное
async function addToFavorites(markerId, userId, customData = null) {
    if (!userId) {
        alert("Необходимо авторизоваться!");
        return;
    }

    try {
        const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                marker_id: markerId,
                custom_data: customData
            })
        });

        if (response.ok) {
            alert('Место добавлено в закладки!');
        } else {
            alert('Ошибка: ' + await response.text());
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось сохранить закладку');
    }
}
