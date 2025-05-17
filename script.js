const SERVER_URL = 'https://harmfully-graced-whale.cloudpub.ru/';
let myMap;

// Инициализация карты
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

    loadMarkersFromServer();
    locateUser(geolocation);

    setupMapClickHandler();
    setupSearchHandler();
}

// Загрузка маркеров с сервера
function loadMarkersFromServer() {
    fetch(`${SERVER_URL}/markers`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(markers => {
            displayMarkers(markers);
            if (markers.length > 0) {
                myMap.setCenter([markers[0].latitude, markers[0].longitude], 12);
            }
        })
        .catch(error => {
            console.error('Error loading markers:', error);
            Telegram.WebApp.showAlert("Ошибка загрузки маркеров");
        });
}

// Отображение маркеров на карте
function displayMarkers(markers) {
    markers.forEach(marker => {
        const placemark = new ymaps.Placemark(
            [marker.latitude, marker.longitude],
            {
                balloonContent: `
                    <div style="padding: 10px; max-width: 250px">
                        <strong>${marker.label}</strong>
                        <div style="margin: 5px 0">
                            Координаты: ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
                        </div>
                        <button onclick="addToFavorites(${marker.id})"
                                style="background: #4CAF50; color: white; border: none; 
                                       padding: 8px 12px; border-radius: 4px; cursor: pointer">
                            Добавить в избранное
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
                                 fill="currentColor" viewBox="0 0 16 16">
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
}

// Обработчик клика по карте
function setupMapClickHandler() {
    myMap.events.add('click', function(e) {
        const coords = e.get('coords');
        const formattedCoords = coords.map(coord => coord.toFixed(6)).join(', ');

        ymaps.geocode(coords).then(function(res) {
            const firstGeoObject = res.geoObjects.get(0);
            if (!firstGeoObject) return;

            const address = firstGeoObject.getAddressLine();
            const name = firstGeoObject.getLocalities().join(', ') || "Неизвестное место";

            const placemark = new ymaps.Placemark(coords, {
                balloonContent: `
                    <div class="placemark-balloon">
                        <strong>${name}</strong>
                        <br>${address}
                        <br><strong>Координаты:</strong> ${formattedCoords}
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
    });
}

// Обработчик поиска
function setupSearchHandler() {
    document.getElementById("search-button").addEventListener("click", () => {
        const query = document.getElementById("search-input").value.trim();
        if (!query) {
            Telegram.WebApp.showAlert("Введите запрос для поиска");
            return;
        }

        ymaps.geocode(query).then(function(res) {
            if (!res || res.geoObjects.getLength() === 0) {
                Telegram.WebApp.showAlert("Ничего не найдено");
                return;
            }

            const firstGeoObject = res.geoObjects.get(0);
            if (!firstGeoObject.geometry) {
                Telegram.WebApp.showAlert("Объект найден, но координаты отсутствуют");
                return;
            }

            const coords = firstGeoObject.geometry.getCoordinates();
            const formattedCoords = coords.map(coord => coord.toFixed(6)).join(', ');
            const name = firstGeoObject.properties.get('name');
            const address = firstGeoObject.getAddressLine();

            const placemark = new ymaps.Placemark(coords, {
                balloonContentHeader: `<strong>${name}</strong>`,
                balloonContentBody: `<strong>Адрес:</strong> ${address}<br>
                                    <strong>Координаты:</strong> ${formattedCoords}`,
                hintContent: name
            }, {
                preset: 'islands#blueDotIconWithCaption',
                openBalloonOnClick: true
            });

            myMap.geoObjects.add(placemark);
            myMap.setCenter(coords, 17);
            placemark.balloon.open();
        }).catch(function(error) {
            console.error("Ошибка геокодера:", error);
            Telegram.WebApp.showAlert("Произошла ошибка при поиске");
        });
    });
}

// Определение местоположения пользователя
function locateUser(geolocation) {
    geolocation.get({
        provider: 'yandex',
        mapStateAutoApply: true
    }).then(function(result) {
        result.geoObjects.options.set('preset', 'islands#redCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение (по IP)'
        });
        myMap.geoObjects.add(result.geoObjects);
    });

    geolocation.get({
        provider: 'browser',
        mapStateAutoApply: false
    }).then(function(result) {
        result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение (по GPS/браузеру)'
        });
        myMap.geoObjects.add(result.geoObjects);

        const coords = result.geoObjects.get(0).geometry.getCoordinates();
        myMap.setCenter(coords, 15, { duration: 300 });
    });
}

// Добавление в избранное
function addToFavorites(markerId) {
    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('user_id');

    if (!userId) {
        tg.showAlert("Не удалось определить пользователя");
        return;
    }

    tg.showConfirm("Добавить это место в избранное?", (confirmed) => {
        if (confirmed) {
            fetch(`${SERVER_URL}/favorites?userId=${userId}&markerId=${markerId}`, {
                method: 'POST'
            })
            .then(response => {
                if (response.ok) return response.text();
                throw new Error(response.statusText);
            })
            .then(message => {
                tg.showAlert(message || "Место добавлено в избранное!");
                myMap.balloon.close();
            })
            .catch(error => {
                console.error('Error:', error);
                tg.showAlert("Ошибка: " + (error.message || "Не удалось добавить в избранное"));
            });
        }
    });
}

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();

    const userId = tg.initDataUnsafe?.user?.id;
    const userName = tg.initDataUnsafe?.user?.first_name || "Пользователь";
    
    document.getElementById("greeting").textContent = `Привет, ${userName}!`;
    document.querySelector(".search-container").classList.remove("hidden");
    document.querySelector(".content").classList.remove("hidden");
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initTelegramWebApp);
