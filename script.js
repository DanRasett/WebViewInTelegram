let myMap;
console.log("User ID from URL:", new URLSearchParams(window.location.search).get('user_id'));
ymaps.ready(init);

function init() {
    let geolocation = ymaps.geolocation;

    myMap = new ymaps.Map('map', {
        center: [55, 34],
        zoom: 10,
        controls: ['geolocationControl', 'zoomControl', 'typeSelector']
    }, {
        searchControlProvider: 'yandex#search'
    });

    myMap.behaviors.enable(['scrollZoom']);

    displayMarkersFromUrl();
    locateUser(geolocation);

    myMap.events.add('click', function (e) {
        const coords = e.get('coords');
        // Форматируем координаты для отображения (6 знаков после запятой)
        const formattedCoords = coords.map(coord => coord.toFixed(6)).join(', ');

        ymaps.geocode(coords).then(function (res) {
            const firstGeoObject = res.geoObjects.get(0);

            if (!firstGeoObject) {
                alert("Не удалось определить объект по координатам");
                return;
            }

            const address = firstGeoObject.getAddressLine();
            const name = firstGeoObject.getLocalities().join(', ') || "Неизвестное место";

            // Создаем временную метку
            const placemark = new ymaps.Placemark(coords, {
                balloonContent: `
                    <div class="placemark-balloon">
                        <strong>${name}</strong>
                        <br>${address}
                        <br><strong>Координаты:</strong> ${formattedCoords}
                        <button class="btn btn-yellow">
                            <div style="color: "white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-bookmark-fill" viewBox="0 0 16 16">
                                    <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                                </svg>
                            </div>
                        </button>
                    </div>
                `
            }, {
                preset: 'islands#blueAirportCircleIcon',
                draggable: false
            });

            // Добавляем метку на карту
            myMap.geoObjects.add(placemark);

            // Открываем балун
            placemark.balloon.open();

            // Удаляем метку после закрытия балуна
            placemark.balloon.events.add('close', function() {
                myMap.geoObjects.remove(placemark);
            });
        });
    });

    document.getElementById("search-button").addEventListener("click", () => {
        const query = document.getElementById("search-input").value.trim();

        if (!query) {
            alert("Введите запрос для поиска.");
            return;
        }

        ymaps.geocode(query).then(function (res) {
            if (!res || res.geoObjects.getLength() === 0) {
                alert("Ничего не найдено ");
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
    });
}

function locateUser(geolocation) {
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

function displayMarkersFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const markersJson = urlParams.get('markers');

    if (markersJson) {
        try {
            const markers = JSON.parse(markersJson);
            markers.forEach(marker => {
                const placemark = new ymaps.Placemark(
                    [marker.latitude, marker.longitude],
                    {
                        balloonContent: `
                            <div class="placemark-balloon">
                                <strong>${marker.label}</strong>
                                <br><strong>Координаты:</strong> ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
                                <button class="btn btn-yellow" onclick="addToFavorites(${marker.id})">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-bookmark-fill" viewBox="0 0 16 16">
                                        <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                                    </svg>
                                </button>
                            </div>
                        `
                    },
                    {
                        preset: 'islands#blueDotIcon',
                        draggable: false
                    }
                );
                myMap.geoObjects.add(placemark);
            });

            // Если есть маркеры, центрируем карту на первом маркере
            if (markers.length > 0) {
                myMap.setCenter([markers[0].latitude, markers[0].longitude], 12);
            }
        } catch (e) {
            console.error("Ошибка при парсинге маркеров:", e);
        }
    }
}

function addToFavorites(markerId) {
    const userId = new URLSearchParams(window.location.search).get('user_id');

    if (!userId) {
        alert("Не удалось определить пользователя");
        return;
    }

    // Отправляем запрос к боту для добавления в избранное
    fetch(`https://api.telegram.org/bot${window.Telegram.WebApp.initData}/addFavorite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            marker_id: markerId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Место добавлено в избранное!");
        } else {
            alert("Ошибка: " + data.message);
        }
    })
    .catch(error => {
        console.error("Ошибка:", error);
        alert("Произошла ошибка при добавлении в избранное");
    });
}
