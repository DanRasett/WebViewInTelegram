let myMap;

ymaps.ready(init);

function init() {
    let geolocation = ymaps.geolocation;

    myMap = new ymaps.Map('map', {
        center: [55, 34],
        zoom: 10,
        controls: ['geolocationControl']
    }, {
        searchControlProvider: 'yandex#search'
    });

    myMap.behaviors.enable(['scrollZoom']);

    locateUser(geolocation);
}

function locateUser(geolocation) {
    // ip
    geolocation.get({
        provider: 'yandex',
        mapStateAutoApply: false
    }).then(function (result) {
        result.geoObjects.options.set('preset', 'islands#redCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение'
        });
        myMap.geoObjects.add(result.geoObjects);
    });

    // по браузеру
    geolocation.get({
        provider: 'browser',
        mapStateAutoApply: false
    }).then(function (result) {
        result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Ваше местоположение'
        });
        myMap.geoObjects.add(result.geoObjects);

        //центровка
        const coords = result.geoObjects.get(0).geometry.getCoordinates();
        myMap.setCenter(coords, 15, { duration: 300 });
    });
}
