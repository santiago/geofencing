var OpenLayers= require('openlayers').OpenLayers;

var Geo= {};

/**
 * Transform a Feature object into its GeoJSON representation
 *
 * @param {OpenLayers.Feature} feature
 */
 Geo.toGeoJSON= function(feature) {
    var geojson_format = new OpenLayers.Format.GeoJSON();
    var geojson= geojson_format.write(feature);
    return geojson;
};

Geo.toFeature= function(geojson) {
};

/**
 * Convert from [lat,lon] to OpenLayers.Geometry.Point
 *
 * @param {Array} location [lat,lon]
 */
 function locationToPoint(location) {
    var point= new OpenLayers.Geometry.Point(location[1],location[0]);
    point.transform(
        new OpenLayers.Projection("EPSG:4326"),
        new OpenLayers.Projection("EPSG:900913")
    );
    return point;
}

/**
 * Generates a new Cover Area from a latlon pair and a radius in map units.
 * Returns a Feature representing the Cover Area.
 *
 * @param {Array} location [lat,lon]
 * @param {Float} radius Radius of the Cover Area in map units
 * @param {Boolean} geojson true If you want it to return geojson instead of an OpenLayers.Feature. Defaults to false.
 */
function generateFeatureFromLocation(location, radius, geojson) {
    var point= locationToPoint(location);

    var geometry= OpenLayers.Geometry.Polygon.createRegularPolygon(point, radius, 40, 0);
    var feature= new OpenLayers.Feature.Vector(geometry);
    if(geojson) {
        return Geo.toGeoJSON(feature);
    }
    return feature;
}

Geo.generateFromLocation= function(location, radius, geojson) {
    var point= locationToPoint(location);

    var geometry= OpenLayers.Geometry.Polygon.createRegularPolygon(point, radius, 40, 0);
    var feature= new OpenLayers.Feature.Vector(geometry);
    if(geojson) {
        return Geo.toGeoJSON(feature);
    }
    return feature;
};


/**
 * Checks what Cover Areas contain a given location
 *
 * @param {Array} location LatLon pair
 * @param {Array} Array of Cover objects represented as { center:[lat,lon], radius:<float> }
 */
Geo.geofenceLocation= function(location, covers) {
    var geofences= [];
    covers.forEach(function(c) {
        var cover= Geo.generateFromLocation(c.center, c.radius);
        // Cover intersects given location?
        if(cover.geometry.intersects(locationToPoint(location))) {
            c.fencing= true;
            c.location= location;
            geofences.push(c);
        }
    });
    return geofences;
};

module.exports= {
    Geo: Geo
};