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
                        <br><button class="btn btn-yellow" onclick="addToFavorites(1)">
                            <div class="balonbut">
                                Добавить в избранное
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

            myMap.geoObjects.add(placemark);

            placemark.balloon.open();

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
