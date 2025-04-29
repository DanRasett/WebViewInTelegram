let myMap;

// Проверяем, что контейнер карты существует
if (!document.getElementById('map')) {
    console.error('Контейнер карты с id="map" не найден!');
} else {
    console.log("User ID from URL:", new URLSearchParams(window.location.search).get('user_id'));
    ymaps.ready(init);
}

function init() {
    try {
        // Создаём карту только если контейнер существует
        myMap = new ymaps.Map('map', {
            center: [46.347, 48.033], // Центр на Астрахань
            zoom: 12,
            controls: ['geolocationControl', 'zoomControl', 'typeSelector']
        }, {
            searchControlProvider: 'yandex#search'
        });

        console.log('Карта успешно создана');

        // Проверяем загрузку API
        if (!ymaps.geolocation) {
            console.error('Геолокация Яндекс.Карт не загружена');
            return;
        }

        // Основные функции
        myMap.behaviors.enable(['scrollZoom']);
        locateUser(ymaps.geolocation);
        setupEventListeners();

        // Загрузка маркеров
        loadMarkers();

    } catch (e) {
        console.error('Ошибка инициализации карты:', e);
        alert('Произошла ошибка при загрузке карты. Пожалуйста, обновите страницу.');
    }
}

function setupEventListeners() {
    // Обработчик клика по карте
    myMap.events.add('click', function(e) {
        const coords = e.get('coords');
        showTemporaryPlacemark(coords);
    });

    // Обработчик поиска
    const searchBtn = document.getElementById("search-button");
    if (searchBtn) {
        searchBtn.addEventListener("click", handleSearch);
    } else {
        console.warn('Кнопка поиска не найдена');
    }
}

function loadMarkers() {
    const markersData = new URLSearchParams(window.location.search).get('markers');

    if (markersData) {
        try {
            const markers = JSON.parse(decodeURIComponent(markersData));
            markers.forEach(marker => {
                new ymaps.Placemark(
                    [marker.latitude, marker.longitude],
                    {
                        balloonContent: formatBalloonContent(marker)
                    },
                    {
                        preset: 'islands#blueDotIcon',
                        balloonCloseButton: true
                    }
                ).addTo(myMap);
            });
        } catch (e) {
            console.error('Ошибка загрузки маркеров:', e);
        }
    }
}

function formatBalloonContent(marker) {
    return `
        <div class="placemark-balloon">
            <strong>${marker.label || 'Метка'}</strong>
            <br>Координаты: ${marker.latitude.toFixed(6)}, ${marker.longitude.toFixed(6)}
            <button class="btn-bookmark" onclick="addToFavorites(${marker.id}, ${userId})">
                ★ Добавить в закладки
            </button>
        </div>
    `;
}

// Остальные функции (locateUser, handleSearch и т.д.) остаются без изменений

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
