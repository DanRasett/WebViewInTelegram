const SERVER_URL = 'https://harmfully-graced-whale.cloudpub.ru/api';
let tg = window.Telegram.WebApp;
let myMap;

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    initTelegramWebApp();
    document.getElementById('search-input').addEventListener('focus', loadFavorites);
    document.getElementById('search-button').addEventListener('click', handleSearchClick);
    ymaps.ready(initMap);
}

function initTelegramWebApp() {
    tg.expand();
    tg.enableClosingConfirmation();

    const userId = tg.initDataUnsafe?.user?.id;
    const userName = tg.initDataUnsafe?.user?.first_name || "Пользователь";

    document.getElementById("greeting").textContent = `Привет, ${userName}!`;
    document.querySelector(".search-container").classList.remove("hidden");
    document.querySelector(".content").classList.remove("hidden");
}

function initMap() {
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
}

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
            tg.showAlert("Ошибка загрузки маркеров");
        });
}

async function loadFavorites() {
    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('user_id');
    if (!userId) {
        console.error('User ID not found');
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/favorites?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const favorites = await response.json();
        populateDatalist(favorites);
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

function populateDatalist(favorites) {
    const datalist = document.getElementById('address-suggestions');
    datalist.innerHTML = '';

    favorites.forEach(favorite => {
        const option = document.createElement('option');
        option.value = favorite.label;
        datalist.appendChild(option);
    });
}

async function handleSearchClick() {
    const query = document.getElementById("search-input").value.trim();
    if (!query) {
        tg.showAlert("Введите запрос для поиска");
        return;
    }

    try {
        // Выполняем GET-запрос к API для получения данных о маркерах
        const response = await fetch(`${SERVER_URL}/markers`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const markers = await response.json();

        // Ищем маркер с соответствующим именем (label)
        const matchedMarker = markers.find(marker => marker.label === query);

        if (matchedMarker) {
            // Если найдено совпадение, используем координаты из базы данных
            const coords = [matchedMarker.latitude, matchedMarker.longitude];

            // Создаем метку на карте
            const placemark = new ymaps.Placemark(coords, {
                balloonContentHeader: `<strong>${matchedMarker.label}</strong>`,
                balloonContentBody: `<strong>Координаты:</strong> ${coords.join(', ')}`,
                hintContent: matchedMarker.label
            }, {
                preset: 'islands#blueDotIconWithCaption',
                openBalloonOnClick: true
            });

            myMap.geoObjects.add(placemark);
            myMap.setCenter(coords, 17);
            placemark.balloon.open();
        } else {
            // Если совпадение не найдено, выполняем геокодирование введенного запроса
            ymaps.geocode(query).then(function(res) {
                if (!res || res.geoObjects.getLength() === 0) {
                    tg.showAlert("Ничего не найдено");
                    return;
                }

                const firstGeoObject = res.geoObjects.get(0);
                if (!firstGeoObject.geometry) {
                    tg.showAlert("Объект найден, но координаты отсутствуют");
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
                tg.showAlert("Произошла ошибка при поиске");
            });
        }
    } catch (error) {
        console.error("Ошибка при выполнении запроса к API:", error);
        tg.showAlert("Произошла ошибка при выполнении запроса к API");
    }
}


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

async function displayMarkers(markers) {
    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('user_id');

    for (const marker of markers) {
        const isFavorite = await isMarkerFavorite(userId, marker.id);
        const placemark = new ymaps.Placemark(
            [marker.latitude, marker.longitude],
            {
                balloonContent: `
                    <div style="padding: 10px; max-width: 250px">
                        <strong>${marker.label}</strong>
                        <div style="margin: 5px 0">
                            Координаты: ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
                        </div>
                        <label class="checkbox-btn">
                            <input type="checkbox" onchange="handleCheckboxChange(this, ${marker.id})" ${isFavorite ? 'checked' : ''}>
                            <div>
                                <span class="unchecked-text">
                                    Добавить в избранное
                                </span>
                                <span class="checked-text">
                                    В избранном
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                    fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                                </svg>
                            </div>
                        </label>
                    </div>
                `
            },
            {
                preset: 'islands#blueDotIcon',
                draggable: false
            }
        );
        myMap.geoObjects.add(placemark);
    }
}

async function isMarkerFavorite(userId, markerId) {
    try {
        const response = await fetch(`${SERVER_URL}/favorites?userId=${userId}`);
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        return data.some(marker => marker.marker_id === markerId);
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

function handleCheckboxChange(checkbox, markerId) {
    if (checkbox.checked) {
        addToFavorites(markerId);
    } else {
        deleteFromFavorites(markerId);
    }
}

function addToFavorites(markerId) {
    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('user_id');

    if (!userId) {
        tg.showAlert("Не удалось определить пользователя");
        return;
    }

    fetch(`${SERVER_URL}/favorites?userId=${userId}&markerId=${markerId}`, {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) return response.text();
        throw new Error(response.statusText);
    })
    .then(message => {
        tg.showAlert(message || "Место добавлено в избранное!");
    })
    .catch(error => {
        console.error('Error:', error);
        tg.showAlert("Ошибка: " + (error.message || "Не удалось добавить в избранное"));
    });
}

function deleteFromFavorites(markerId) {
    const userId = tg.initDataUnsafe?.user?.id || new URLSearchParams(window.location.search).get('user_id');

    if (!userId) {
        tg.showAlert("Не удалось определить пользователя");
        return;
    }

    fetch(`${SERVER_URL}/favorites?userId=${userId}&markerId=${markerId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) return response.text();
        throw new Error(response.statusText);
    })
    .then(message => {
        tg.showAlert(message || "Место удалено из избранного!");
    })
    .catch(error => {
        console.error('Error:', error);
        tg.showAlert("Ошибка: " + (error.message || "Не удалось удалить объект из избранного"));
    });
}
