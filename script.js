@class
@name GeolocationService
@see http://www.w3.org/TR/geolocation-API/
@see http://api.yandex.ru/maps/doc/jsapi/2.x/ref/reference/geolocation.xml

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
            
            // Добавляем метку местоположения пользователя с динамическим масштабированием
            let userPlacemark = new ymaps.Placemark(userLocation, {
                balloonContent: 'Вы здесь'
            }, {
                iconLayout: 'default#image',
                iconImageHref: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
                iconImageSize: [20, 20],
                iconImageOffset: [-10, -10]
            });
            
            map.geoObjects.add(userPlacemark);

            // Изменяем размер метки в зависимости от масштаба карты
            map.events.add('boundschange', function (event) {
                let zoom = event.get('newZoom');
                let newSize = Math.max(10, zoom * 2);
                userPlacemark.options.set('iconImageSize', [newSize, newSize]);
                userPlacemark.options.set('iconImageOffset', [-newSize / 2, -newSize / 2]);
            });
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
