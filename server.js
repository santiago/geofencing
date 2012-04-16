var express= require('express');
var stylus= require('stylus');

function compile(str, path) {
    return stylus(str)
             .set('filename', path);
    // .set('compress', true);
}

var app = express.createServer();
app.configure(function(){
    // this.set('views', __dirname + '/views');
    // this.set('view engine', 'jade');
    this.use(express.bodyParser());
    // this.use(express.logger());
    this.use(express.methodOverride());
    this.use(express.cookieParser());
    this.use(express.session({secret: 'a1b2c2d3e4f5g6'}));
    this.use(stylus.middleware({
        src: __dirname + '/views', 
        dest: __dirname + '/public',
        compile: compile
    }));
    this.use(express.static(__dirname + '/public'));
    // Keep this as last one
    this.use(this.router);
});

app.get('/', function(req, res){
    res.send('Hello World');
});

var nowjs = require("now");
var everyone = nowjs.initialize(app);

//everyone.now.Openlayers = require('openlayers').OpenLayers;
/*var OpenLayers= require('openlayers').OpenLayers;
everyone.now.OpenLayers = {
    Class: OpenLayers.Class
}*/
// new OpenLayers.Class();


app.listen(8000);

// Celebra el día de la secretaría con Santa Tentación. Demuestra tu gratitud y alegra el día de esa persona que con su ayuda y 
// compromiso hace tu vida más sencilla. 