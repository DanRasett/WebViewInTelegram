let myMap;

ymaps.ready(init);

function init() {
    let geolocation = ymaps.geolocation;

    myMap = new ymaps.Map('map', {
        center: [55, 34],
        zoom: 10,
        controls: ['geolocationControl', 'zoomControl', 'typeSelector', 'searchControl']
    }, {
        searchControlProvider: 'yandex#search'
    });

    myMap.behaviors.enable(['scrollZoom']);

    // Геолокация (IP и браузер)
    locateUser(geolocation);

    // Обработка клика по карте — показать инфо о месте
    myMap.events.add('click', function (e) {
        const coords = e.get('coords');

        // Обратное геокодирование
        ymaps.geocode(coords).then(function (res) {
            const firstGeoObject = res.geoObjects.get(0);

            if (!firstGeoObject) {
                alert("Не удалось определить объект по координатам");
                return;
            }

            const address = firstGeoObject.getAddressLine();
            const name = firstGeoObject.getLocalities().join(', ') || "Неизвестное место";

            const placemark = new ymaps.Placemark(coords, {
                balloonContent: `<strong>${name}</strong><br>${address}`
            }, {
                preset: 'islands#violetDotIcon'
            });

            myMap.geoObjects.add(placemark);
            placemark.balloon.open();
        });
    });
}

function locateUser(geolocation) {
    // Геолокация по IP
    geolocation.get({
        provider: 'yandex',
        mapStateAutoApply: false
    }).then(function (result) {
        result.geoObjects.options.set('preset', 'islands#redCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение (по IP)'
        });
        myMap.geoObjects.add(result.geoObjects);
    });

    // Геолокация по браузеру
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
