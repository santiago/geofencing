var Util= {
    onEnter: function(ctx, callback) {
        $(ctx).keyup(function(e) {
            if(e.keyCode==13) {
                callback(e);
            };
        });
    }
};

var Geo= {};
function locationToPoint(location) {
    var point= new OpenLayers.Geometry.Point(location[1],location[0]);
    point.transform(
        new OpenLayers.Projection("EPSG:4326"),
        new OpenLayers.Projection("EPSG:900913")
    );
    return point;
}

Geo.createFeature= function(cover, attrs) {
    var point= locationToPoint(cover.center);

    var geometry= OpenLayers.Geometry.Polygon.createRegularPolygon(point, cover.radius, 40, 0);
    var feature= new OpenLayers.Feature.Vector(geometry, attrs);
    feature.fid= cover.id;
    return feature;
};

Geo.createFeatureFromLocation= function(location, radius) {
    var point= locationToPoint(location);

    var geometry= OpenLayers.Geometry.Polygon.createRegularPolygon(point, radius, 40, 0);
    var feature= new OpenLayers.Feature.Vector(geometry, { fencing: 0 });
    return feature;
};

var App;

function getPolygonLayer() {
    var defStyle = new OpenLayers.Style(
        {
            //fillColor: "#ffcc66",
            //strokeColor: "#ff9933",
            fillColor: "#ee9900",
            strokeColor: "#ee9900",
            fillOpacity: 0.4,
            strokeWidth: 1
        },
        {
            rules: [
                new OpenLayers.Rule({
                    filter: new OpenLayers.Filter.Comparison({
                        type: OpenLayers.Filter.Comparison.EQUAL_TO,
                        property: "fencing",
                        value: null
                    })
                }),                
                new OpenLayers.Rule({
                    filter: new OpenLayers.Filter.Comparison({
                        type: OpenLayers.Filter.Comparison.EQUAL_TO,
                        property: "fencing",
                        value: 0
                    }),
                    symbolizer: {
                    }
                }),
                new OpenLayers.Rule({
                    // a rule contains an optional filter
                    filter: new OpenLayers.Filter.Comparison({
                        type: OpenLayers.Filter.Comparison.EQUAL_TO,
                        property: "fencing",
                        value: 1
                    }),
                    // if a feature matches the above filter, use this symbolizer
                    symbolizer: {
                        fillColor: "#123456",
                        strokeColor: "#123456"
                    }
                })
            ]
    });
        
    return new OpenLayers.Layer.Vector("Polygon Layer", {
        styleMap: new OpenLayers.StyleMap({
            default: defStyle
        })
    });
}

function init(opts) {
    var self= this;
    this.userId= opts.userId;
    this.service= opts.service;

    var lastMouseDown= [];
    var polygonControl={};
    var selectFeatureControl={};
    var removeFeatures= [];
    
    // Setup Polygon Layer
    var polygonLayer= getPolygonLayer();
        
    this.deleteFeatures= function() {
        if(!removeFeatures.length) { return false }
        polygonLayer.destroyFeatures(removeFeatures);
        removeFeatures.forEach(function(feature) {
            self.service.geofencing.send({ message: {event:"remove_cover", id:feature.fid} });
        });
        removeFeatures= [];
    };
    this.isDrawing= function() {
        return polygonControl.active;
    };
    this.isRemoving= function() {
        return selectFeatureControl.active;
    };
    this.toggleDraw= function() {
        if(this.isDrawing()) {
            polygonControl.deactivate();
            $("#actions .action.draw").removeClass('on');
            $.jGrowl("Drawing stopped");
        } else {
            polygonControl.activate();
            $("#actions .action.draw").addClass('on');
            $.jGrowl("Drawing started.\nPlease drag on the map to draw a Cover Area.");
        }
    };
    this.toggleRemove= function() {
        if(this.isRemoving()) {
            selectFeatureControl.deactivate();
            $("#actions .action.remove").removeClass('on');
            $.jGrowl("Removing stopped");
        } else {
            selectFeatureControl.activate();
            $("#actions .action.remove").addClass('on');
            $.jGrowl("Removing started.\nClick on the Cover Area you want to remove, then press Esc.");
        }
    };

    // Evaluate incoming events
    $(document).on('geo:data', function(e, from, data) {
        switch(data.event) {
            case "enter_area":
                if(data.covers.length) {
                    //var noti= "You're within these regions: \n"+data.covers.join(', ');
                    //$.jGrowl(noti);
                    data.covers.forEach(function(cover) {
                        var feature= Geo.createFeature(cover, { fencing: 1 });
                        var __off= polygonLayer.getFeatureByFid(cover.id);
                        polygonLayer.destroyFeatures([__off]);
                        polygonLayer.addFeatures(feature);
                    });
                }                
                break;
            case "new_cover":
                self.service.geofencing.send({ message: {event:"get_covers"} });
                break;
            case "covers":
                polygonLayer.destroyFeatures();
                data.covers.forEach(function(cover) {
                    var feature= Geo.createFeatureFromLocation(cover.center, cover.radius);
                    feature.fid= cover.id;
                    polygonLayer.addFeatures(feature);
                });
                self.sendPosition();
                break;
            default:
                break;
        }
    });

    // Render Geo UI
    startUi.call(this);

    // The marker icon
    var size = new OpenLayers.Size(21,25);
    var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
    var icon = new OpenLayers.Icon('/images/marker.png', size, offset);

    this.map = new OpenLayers.Map('map');
    var map= this.map;
    map.addControl(new OpenLayers.Control.LayerSwitcher());

    var markers = new OpenLayers.Layer.Markers("Markers");
    map.addLayer(markers);

    $("#map").on('mousedown', function(e) {
        var point= map.getLonLatFromViewPortPx({x:e.offsetX,y:e.offsetY});
        point.transform(
            map.getProjectionObject(),
            new OpenLayers.Projection("EPSG:4326"));
        lastMouseDown= [point.lat,point.lon];
    });
    
    map.events.register('click', this, function(e) {
        var point= map.getLonLatFromViewPortPx(e.xy);
        //markers.addMarker(new OpenLayers.Marker(point,icon));
    });

    var gphy = new OpenLayers.Layer.Google(
        "Google Physical",
        {type: google.maps.MapTypeId.TERRAIN}
    );
    
    var gmap = new OpenLayers.Layer.Google(
        "Google Streets", // the default
        {numZoomLevels: 20}
    );
    var ghyb = new OpenLayers.Layer.Google(
        "Google Hybrid",
        {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
    );
    var gsat = new OpenLayers.Layer.Google(
        "Google Satellite",
        {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
    );
    
    map.addLayers([gmap, gphy, ghyb, gsat]);

    // Google.v3 uses EPSG:900913 as projection, so we have to
    // transform our coordinates
    map.setCenter(new OpenLayers.LonLat(10.2, 48.9).transform(
        new OpenLayers.Projection("EPSG:4326"),
        map.getProjectionObject()
    ), 5);

    map.addLayers([polygonLayer]);
    map.addControl(new OpenLayers.Control.MousePosition());

    selectFeatureControl= new OpenLayers.Control.SelectFeature(polygonLayer, {
        onSelect: function(e,f) {
            removeFeatures=[e];
        }
    });
    map.addControl(selectFeatureControl);
    var polyOptions = {sides: 40};
    polygonControl = new OpenLayers.Control.DrawFeature(
                        polygonLayer,
                        OpenLayers.Handler.RegularPolygon, 
                        {   handlerOptions: polyOptions,
                            featureAdded: function(feature) {
                                var radius= Math.sqrt(feature.geometry.getArea()/Math.PI);
                                var center= lastMouseDown;
                                // should trigger event here and the next should happen
                                // within a callback
                                self.service.geofencing.send({
                                    message: {event:"add_cover", cover: {center:center, radius:radius}}
                                });
                            }
                        });

    var dragPolygons= new OpenLayers.Control.DragFeature(polygonLayer);
    map.addControl(polygonControl);
    map.addControl(dragPolygons);

    $(window).keyup(function(e) {
        // If D for Draw
        if(e.keyCode==68) {
            self.toggleDraw();
        };
        // If E for Edit
        /*if(e.keyCode==69) {
            dragPolygons.activate();
        };*/
        // If X for Select to delete
        if(e.keyCode==88) {
            self.toggleRemove();
        };
        // Esc to remove region
        if(e.keyCode==27) {
            self.deleteFeatures();
        };
        // Space Bar
        if(e.keyCode==32) {
            $.jGrowl("Drawing deactivated");
            dragPolygons.deactivate();
            polygonControl.deactivate();
        };
    });

    function success(pos) {
        self.position= [pos.coords.latitude,pos.coords.longitude];
        var point= new OpenLayers.LonLat(self.position[1],self.position[0])
                        .transform(new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject());
        map.setCenter(point, 16);
        markers.addMarker(new OpenLayers.Marker(point,icon));
        //self.popup();
        now.sendPosition();
    }

    function error(error) {
        console.log(error);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        alert('not supported');
        return;
    }
}

// init public methods
init.prototype.sendPosition= function() {
    now.sendPosition();
};

init.prototype.popup= function() {
    var popup= new OpenLayers.Popup("arroz con pollo", // Label
                    new OpenLayers.LonLat(this.position[1],this.position[0]), // Point
                    new OpenLayers.Size(200,200), // Size
                    "example popup", // Text
                    true); // ?
    this.map.addPopup(popup);
};

// init private methods
function startUi() {
    var self= this;
    
    $(".start").hide();
    $("#main").show();
    $("header .user").text(this.userId);
    
    $("#actions .action").click(function(e) {
        e.preventDefault();
        $(this).blur();
        if($(this).hasClass('draw')) { self.toggleDraw() }
        if($(this).hasClass('remove')) { self.toggleRemove() }
    });
}

// Start the App
jQuery(document).ready(function($) {
    var userId= sessionStorage.getItem("userId");
    if(!userId) {
        $(".start").show();
        $("#loadUser input").focus();

        function go() {
            var user= $.trim($("#loadUser input").val());
            if(user) {
                userId= user;
                sessionStorage.setItem("userId", userId);
                $("#loadUser .ajaxloader").show();
                $("#loadUser input").prop('disabled', true);
                $("#loadUser input").blur();
            } else {
                $("#loadUser input").focus();
            }
        }

        // Go! on enter
        Util.onEnter("#loadUser input", function(e) {
            go();
        });

        // Go! on click
        $("#loadUser button").on('click', function(e) {
            go();
        });
    } else {
        new Service({userId:userId});
    }
});