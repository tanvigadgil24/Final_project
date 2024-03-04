var mapView = new ol.View({
    center: ol.proj.fromLonLat([72.8710, 19.0211]),
    zoom: 18.2
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
        url: 'http://localhost:8080/geoserver/mp1/wms',
        params: {
            'LAYERS': 'mp1:VIT_Shapefile',
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

closer.onclick = function () {
    popup.setPosition(undefined);
    closer.blur();
    return false;
};

map.on('singleclick', function (evt) {
    content.innerHTML = '';
    var clickedCoord = evt.coordinate;

    var transformedCoord = ol.proj.transform(clickedCoord, 'EPSG:3857', 'EPSG:4326');

    var resolution = mapView.getResolution();
    var url = vitpolygonshpfile.getSource().getFeatureInfoUrl(transformedCoord, resolution, 'EPSG:4326', {
        'INFO_FORMAT': 'application/json',
        'propertyName': 'Type, height'
    });

    if (url) {
        $.getJSON(url, function (data) {
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

var mousePositionControl = new ol.control.MousePosition({
    coordinateFormat: function (coordinate) {
        return ol.coordinate.format(coordinate, '{y}, {x}', 6);
    },
    projection: 'EPSG:4326',
    className: 'mouse-position',
    target: document.getElementById('mouse-position'),
    undefinedHTML: '&nbsp;'
});

map.addControl(mousePositionControl);

var geojson;
var featureOverlay;

var qryButton = document.createElement('button');
qryButton.innerHTML='<img src="../../resources/images/query.svg" alt='
qryButton.className = 'myButton';
qryButton.id = 'qryButton';

var qryElement = document.createElement('div');
qryElement.className = 'myButtonDiv';
qryElement.appendChild(qryButton);

var qryControl = new ol.control.Control({
    element: qryElement
})

var qryFlag = false;
var qryButton = document.getElementById("yourQryButtonId"); // Replace "yourQryButtonId" with the actual ID of your query button

qryButton.addEventListener("click", () => {
    qryButton.classList.toggle('clicked');
    qryFlag = !qryFlag;
    document.getElementById("map").style.cursor = "default";
    if (qryFlag) {
        if (geojson) {
            geojson.getSource().clear();
            map.removeLayer(geojson);
        }
        if (featureOverlay) {
            featureOverlay.getSource().clear();
            map.removeLayer(featureOverlay);
        }
        
        document.getElementById("attQueryDiv").style.display = "block";
        
        bolIdentify = false;
        
        addMapLayerList();
    } else {
        
        document.getElementById("attQueryDiv").style.display = "none";
        
        document.getElementById("attlistDiv").style.display = "none";
        
        if (geojson) { 
            geojson.getSource().clear(); 
            map.removeLayer(geojson);
        }
        
        if (featureOverlay) { 
            featureOverlay.getSource().clear(); 
            map.removeLayer(featureOverlay);
        }
    }
});

map.addControl(qryControl); // Make sure qryControl is defined and contains your control

function addMapLayerList() {
    $(document).ready(function () {
        $.ajax({
            type: "GET",
            url: "http://localhost:8080/geoserver/mp1/wfs?request-GetCapabilities",
            dataType: "xml",
            success: function (xml) {
                var select = $('#selectLayer');
                select.append("<option class='ddindent' value=''></option>");

                $(xml).find('FeatureType').each(function () {
                    $(this).find('Name').each(function () {
                        var value = $(this).text();
                        select.append("<option class='ddindent' value='" + value + "'>" + value + "</option>");
                    });
                });
            }
        });
    });
}

$(function () {

    document.getElementById("selectLayer").onchange = function () {
        var select = document.getElementById("selectAttribute");
        while (select.options.length > 0) {
            select.remove(0);
        }
        var value_layer = $(this).val();
        $(document).ready(function () {
            $.ajax({
                type: "GET",
                url: "http://localhost:8080/geoserver/wfs?service=WFS&request=DescribeFeatureType&version=1.1.0&typeName=" + value_layer,
                dataType: "xml",
                success: function (xml) {
                    
                    var select = $('#selectAttribute');
                    
                    select.append("<option class='ddindent' value=''></option>");
                    $(xml).find('xsd\\:sequence').each(function () {
                        
                        $(this).find('xsd\\:element').each(function () {
                            
                            var value = $(this).attr('name');

                            var type = $(this).attr('type');

                            if (value !== 'geom' && value !== 'the_geom') {
                                select.append("<option class='ddindent' value='" + type + "'>" + value + "</option>");
                            }

                        });

                    });

                }

            });

        });

    }

});

document.getElementById("selectAttribute").onchange = function () {
    var operator = document.getElementById("selectOperator");

    while (operator.options.length > 0) {
        operator.remove(0);
    }

    var value_type = this.value;
    var value_attribute = $('#selectAttribute option:selected').text();

    operator.options[0] = new Option('Select operator', "");

    if (value_type == 'xsd:short' || value_type == 'xsd:int' || value_type == 'xsd:double') {
        operator.options[1] = new Option('Greater than', '>');
        operator.options[2] = new Option('Less than', '<');
        operator.options[3] = new Option('Equal to', '=');
    } else if (value_type == 'xsd:string') {
        operator.options[1] = new Option('Like', 'Like');
        operator.options[2] = new Option('Equal to', '-');
    }
};

document.getElementById('attQryRun').onclick = function () {
    map.set("isLoading", 'YES');

    if (featureOverlay) {
        featureOverlay.getSource().clear();
        map.removeLayer(featureOverlay);
    }

    var layer = document.getElementById("selectLayer");
    var attribute = document.getElementById("selectAttribute");
    var operator = document.getElementById("selectOperator");
    var txt = document.getElementById("enterValue");

    if (layer.options.selectedIndex == 0) {
        alert("Select Layer");
    } else if (attribute.options.selectedIndex == -1) {
        alert("Select Attribute");
    } else if (operator.options.selectedIndex <= 0) {
        alert("Select Operator");
    } else if (txt.value.length <= 0) {
        alert("Enter Value");
    } else {
        var value_layer = layer.options[layer.selectedIndex].value;
        var value_attribute = attribute.options[attribute.selectedIndex].text;
        var value_operator = operator.options[operator.selectedIndex].value;
        var value_txt = txt.value;

        if (value_operator == 'Like') {
            value_txt = "%25" + value_txt + "%25";
        } else {
            value_txt = value_txt;
        }

        var url = "http://localhost:8080/geoserver/GISSimplified/mp1/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + value_layer + "&CQL_FILTER=" +  value_attribute +  value_operator + value_txt + "&outputFormat=application/json";

        newaddGeoJsonToMap(url);
        newpopulateQueryTable(url);
        setTimeout(function() { newaddRowHandlers(url);}, 300);
        map.set("isLoading", 'NO');
    }
};

function newaddGeoJsonToMap(url) {
    if (geojson) { 
        geojson.getSource().clear(); 
        map.removeLayer(geojson);
    }

    var style = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#FFFF00',
            width: 3
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: '#FFFF00' })
        })
    });

    var geojson = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: style 
    });

    geojson.getSource().on('addfeature', function () {
        map.getView().fit(
            geojson.getSource().getExtent(),
            { duration: 1590, size: map.getSize(), maxZoom: 21 }
        );
    });

    map.addLayer(geojson);
}

function newpopulateQueryTable(url) {
    if (typeof attributePanel !== 'undefined') {
        if (attributePanel.parentElement !== null) {
            attributePanel.close();
        }
    }
    
    $.getJSON(url, function(data) {
        var col = [];
        col.push('id');
        
        for (var i = 0; i < data.features.length; i++) {
            for (var key in data.features[i].properties) {
                if (col.indexOf(key) === -1) {
                    col.push(key);
                }
            }
        }
        
        var table = document.createElement("table");
        table.setAttribute("class", "table table-bordered table-hover table-condensed");
        table.setAttribute("id", "attQryTable");
        
        // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.
        var tr = table.insertRow(-1);
        
        // TABLE ROW.
        for (var i = 0; i < col.length; i++) {
            var th = document.createElement("th");
            // TABLE HEADER.
            th.innerHTML = col[i];
            tr.appendChild(th);
        }
        
        // ADD JSON DATA TO THE TABLE AS ROWS.
        for (var i = 0; i < data.features.length; i++) {
            var tr = table.insertRow(-1);
            for (var j = 0; j < col.length; j++) {
                var tabCell = tr.insertCell(-1);
                if (j === 0) {
                    tabCell.innerHTML = data.features[i]['id'];
                } else {
                    tabCell.innerHTML = data.features[i].properties[col[j]];
                }
            }
        }
        
        var tabDiv = document.getElementById('attlistDiv');
        var delTab = document.getElementById('attQryTable');
        if (delTab) {
            tabDiv.removeChild(delTab);
        }
        tabDiv.appendChild(table);
    });
    
    document.getElementById("attListDiv").style.display = "block";
}
    
