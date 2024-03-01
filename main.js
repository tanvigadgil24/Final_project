var mapView = new ol.View({
    center: ol.proj.fromLonLat([72.585717, 23.021245]),
    zoom: 8
});

var map = new ol.Map({
    target: 'map',
    view: mapView
});

var osmTile = new ol.layer.Tile({
    title: 'Open Street Map',
    visible: true,
    source: new ol.source.OSM()
});

map.addLayer(osmTile);

var vitpolygonshpfile = new ol.layer.Tile({
    title: "VIT_ShapeFile_updated",
    source: new ol.source.TileWMS({
        url: 'http://localhost:8080/geoserver/VitShpUpdated2/wms',
        params: {
            'LAYERS': 'VitShpUpdated2:Vitpolyfile2',
            'TILED': true
        },
        serverType: 'geoserver',
        visible: true
    })
});

map.addLayer(vitpolygonshpfile);

var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

var popup = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250,
    },
});
map.addOverlay(popup);

closer.onclick = function() {
    popup.setPosition(undefined);
    closer.blur();
    return false;
};

map.on('singleclick', function(evt) {
    content.innerHTML = '';
    var clickedCoord = evt.coordinate;

    var transformedCoord = ol.proj.transform(clickedCoord, 'EPSG:3857', 'EPSG:4326');

    var resolution = mapView.getResolution();
    var url = vitpolygonshpfile.getSource().getFeatureInfoUrl(transformedCoord, resolution, 'EPSG:4326', {
        'INFO_FORMAT': 'application/json',
        'propertyName': 'Type, height'
    });

    if (url) {
        $.getJSON(url, function(data) {
            var feature = data.features[0];
            var props = feature.properties;
            content.innerHTML = "<h3> State: </h3> <p>" + props.state.toUpperCase() + "</p> <br> <h3> District: </h3> <p>" +
                props.district.toUpperCase() + "</p>";
            popup.setPosition(evt.coordinate);
        });
    } else {
        popup.setPosition(undefined);
    }
});

var geoJsonSource = new ol.source.Vector({
    url: 'data/JSON%20files.json',
    format: new ol.format.GeoJSON()
});

var vitPolygonGeoJSON = new ol.layer.Vector({
    title: "VIT_ShapeFile_updated",
    source: geoJsonSource
});

map.addLayer(vitPolygonGeoJSON);

map.on('singleclick', function(evt) {
    content.innerHTML = '';
    var clickedCoord = evt.coordinate;

    map.forEachFeatureAtPixel(evt.pixel, function(feature) {
        var props = feature.getProperties();
        content.innerHTML = "<h3> State: </h3> <p>" + props.state.toUpperCase() + "</p> <br> <h3> District: </h3> <p>" +
            props.district.toUpperCase() + "</p>";
        popup.setPosition(evt.coordinate);
    });
});

var mousePositionControl = new ol.control.MousePosition({
    coordinateFormat: function(coordinate) {
        return ol.coordinate.format(coordinate, '{y}, {x}', 6);
    },
    projection: 'EPSG:4326',
    className: 'mouse-position',
    target: document.getElementById('mouse-position'),
    undefinedHTML: '&nbsp;'
});

map.addControl(mousePositionControl);
