let center = [48.8866527839977, 2.34310679732974];

function init() {
    let map = new ymaps.Map('map', {
        center: center,
        zoom: 17
    });

    map.controls.remove('searchControl'); // удаляем поиск
    map.controls.remove('trafficControl'); // удаляем контроль трафика
    map.controls.remove('typeSelector'); // удаляем тип
    map.controls.remove('zoomControl'); // удаляем контрол зуммирования
    map.controls.remove('fullscreenControl'); // удаляем кнопку перехода в полноэкранный режим
    map.controls.remove('rulerControl'); // удаляем контрол правил
    map.behaviors.enable(['scrollZoom']); // отключаем скролл карты (опционально)

    // Определяем местоположение пользователя
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            let userLocation = [position.coords.latitude, position.coords.longitude];
            map.setCenter(userLocation);
        });
    }

    document.getElementById('search-button').addEventListener('click', function() {
        var address = document.getElementById('search-input').value;
        if (address) {
            // Используем геокодер для поиска адреса
            ymaps.geocode(address, {
                results: 1
            }).then(function (res) {
                var firstGeoObject = res.geoObjects.get(0);
                var coords = firstGeoObject.geometry.getCoordinates();
                var bounds = firstGeoObject.properties.get('boundedBy');

                // Устанавливаем центр карты и масштаб
                map.setBounds(bounds, {
                    checkZoomRange: true
                });

                // Добавляем метку на карту
                var myPlacemark = new ymaps.Placemark(coords, {
                    balloonContent: firstGeoObject.properties.get('text')
                });
                map.geoObjects.add(myPlacemark);
            });
        }
    });
}

ymaps.ready(init);
