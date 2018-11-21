var map, dialog;
      require([
        "esri/map", "esri/dijit/HomeButton", "esri/dijit/LocateButton", "esri/dijit/BasemapToggle",
         "esri/dijit/Search", "esri/geometry/Extent", "esri/layers/FeatureLayer", "esri/layers/OpenStreetMapLayer",
        "esri/layers/RasterLayer", "esri/layers/ImageServiceParameters", "esri/layers/MosaicRule",
        "esri/layers/DimensionalDefinition",
        "dijit/form/VerticalSlider","dijit/form/VerticalRule",
        "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", 
        "esri/renderers/SimpleRenderer", "esri/graphic", "esri/lang",
        "esri/Color", "dojo/number", "dojo/dom-style", 
        "dijit/TooltipDialog", "dijit/popup",  "esri/dijit/OverviewMap",
        "dojo/parser", "esri/symbols/SimpleMarkerSymbol","esri/geometry/screenUtils",
        "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dojo/dom",
        "dojo/dom-construct",
        "dojo/query",
        "dojo/_base/Color", "dojox/charting/Chart2D", "dojox/charting/plot2d/Pie",
        "dojox/charting/themes/Desert", "dijit/form/Button", "dojo/domReady!"

      ], function(
        Map, HomeButton, LocateButton, BasemapToggle, Search, Extent, FeatureLayer,
        OpenStreetMapLayer, RasterLayer, ImageServiceParameters, MosaicRule,
        DimensionalDefinition,
        VerticalSlider, VerticalRule,
        SimpleFillSymbol, SimpleLineSymbol,
        SimpleRenderer, Graphic, esriLang,
        Color, number, domStyle,
        TooltipDialog, dijitPopup, OverviewMap, 
        parser, SimpleMarkerSymbol, screenUtils, dom, domConstruct, query
      ) {
        var queryTask, query, openStreetMapLayer;
        parser.parse(); 
        
        map = new Map("mapDiv", {
          basemap: "streets",
          center: [-80.94, 33.646],
          zoom: 8
        });

        var home = new HomeButton({
          theme: "HomeButton",
          map: map
        }, "homeButtonDiv");
        home.startup();

        var geolocate = new LocateButton({
          map: map
        }, "locateButtonDiv");
        geolocate.startup();

        openStreetMapLayer = new OpenStreetMapLayer();
        var isOsmLayerAdded = false;
        var osmButton = document.getElementById("osmButton");
        osmButton.onclick = function(){
          if(!isOsmLayerAdded){
            map.addLayer(openStreetMapLayer);
            isOsmLayerAdded = true;
          } else {
            map.removeLayer(openStreetMapLayer);
            isOsmLayerAdded = false;
          }
        };


        var rulesNode = document.getElementById("rulesNode");

        // var sliderRules = new VerticalRule({
        //     count: 11,
        //     style: "width:5px;"
        // }, rulesNode).startup();

        // var slider = new VerticalSlider({
        //     name: "verticalDiv",
        //     value: [-3, 37],
        //     minimum: -3,
        //     maximum: 37,
        //     intermediateChanges: true,
        //     style: "height:300px;"
        // }, "verticalDiv").startup();

        colorRamp = [];
        for(var i = 0; i < 256; i++){
          colorRamp.push([i, 30, 255-i]);
        }

        var dim = [];
        dim.push(new DimensionalDefinition({
          variableName: "water_temp",
          dimensionName: "StdZ",
          values: [0],
          isSlice: true
        }));
        dim.push(new DimensionalDefinition({
          "variableName": "water_temp",
          "dimensionName": "StdTime",
          "values": [1396828800000],
          "isSlice": true
        }));

        var defaultMosaic = {};
        defaultMosaic.multidimensionalDefinition = dim;

        var params = new ImageServiceParameters();
        params.mosaicRule = new MosaicRule(defaultMosaic);

        var currentMin, currentMax;
        var rasterUrl = "https://sampleserver6.arcgisonline.com/arcgis/rest/services/ScientificData/SeaTemperature/ImageServer";
        var rasterLayer = new RasterLayer(rasterUrl, {
          opacity: 1,
          pixelFilter : maskPixels,
          imageServiceParameters: params
        });
        map.addLayer(rasterLayer);

        function maskPixels(pixelData){
          if(pixelData == null || pixelData.pixelBlock == null){
            return;
          }
          if(currentMin === undefined || currentMax === undefined){
            setPixelFilter();
          }

          var pixelBlock = pixelData.pixelBlock;
          var pixels = pixelBlock.pixels;
          var mask = pixelBlock.mask;
          var numPixels = pixelBlock.width * pixelBlock.height;
          var minVal = rasterLayer.bands[0].min;
          var maxVal = rasterLayer.bands[0].max;
          var factor = 255.0/(maxVal - minVal);
          if(pixels == null){
            return;
          }
          var p1 = pixels[0];
          var pr = new Uint8Array(p1.length);
          var pg = new Uint8Array(p1.length);
          var pb = new Uint8Array(p1.length);

          if(mask == null){
            mask = new Uint8Array(p1.length);
          }
          
          var p = [];
          for (var i = 0; i < numPixels; i++) {
          mask[i] = (p1[i] >= Math.floor(currentMin) && p1[i] <= Math.floor(currentMax)) ? 1 : 0;

          //apply color based on temperature value of each pixel
          if (mask[i]) {
            p[i] = Math.floor((p1[i] - minVal) * factor);
            pr[i] = colorRamp[p[i]][0];  //red
            pg[i] = colorRamp[p[i]][1];  //green
            pb[i] = colorRamp[p[i]][2];  //blue
          }
          }

          pixelData.pixelBlock.pixels = [pr, pg, pb];
          pixelData.pixelBlock.statistics = null;
          pixelData.pixelBlock.pixelType = "U8";

        };

        function setPixelFilter(){
          //var val = slider.get('value');
          currentMin = 10;
          currentMax = 37;
          rasterLayer.redraw();
        };

        var toggle = new BasemapToggle({
          map: map,
          basemap: "satellite"
        }, "BasemapToggle");
        toggle.startup();

        var search = new Search({
          map: map,
        }, "search");

        var extent = new Extent({
         "spatialReference": {
            "wkid": 102100
            },
         "xmin":  -19942592,
            "xmax": 200128488,
            "ymin": 2023652.796875,
            "ymax": 11537127.5
         });

        var sources = search.get("sources");

        sources.push({
          activeSourceIndex: 1,
          featureLayer: new FeatureLayer("https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Counties/FeatureServer/0"),
          searchFields: ["NAME"],
          suggestionTemplate: "${STATE_NAME}: ${NAME}",
          exactMatch: false,
          name: "US States",
          outFields: ["*"],
          placeholder: "Search for Population",
          maxResults: 4,
          maxSuggestions: 4,
          enableSuggestions: true,
          minCharacters: 1
        });

        search.set("sources", sources);
        search.startup()

        search.on("select-result", showLocation);

        function showLocation(e) {
          map.graphics.clear();
          map.infoWindow.hide();
          console.log(e.result.name);
          var stateName = e.result.feature.attributes.STATE_NAME;
          featureLayer.setDefinitionExpression("STATE_NAME = " + "'" + stateName + "'");
        }

        var overviewMapDijit = new OverviewMap({
          map: map,
          visible: false,
          attachTo: "bottom-right",
          color:"#D84E13",
          expandFactor: 4,
          maximizeButton: true
        });
        overviewMapDijit.startup();

        var featureLayer = new FeatureLayer("https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Counties/FeatureServer/0", {
          mode: FeatureLayer.MODE_SNAPSHOT,
          outFields: ["NAME", "STATE_NAME", "POP2010", "POPULATION", "MALES","FEMALES"]
        });
        
        featureLayer.setDefinitionExpression("STATE_NAME = 'South Carolina'");

        var symbol = new SimpleFillSymbol(
          SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([255,255,255,0.35]),
            1
          ),
          new Color([125,125,125,0.35])
        );
        featureLayer.setRenderer(new SimpleRenderer(symbol));
        map.addLayer(featureLayer);

        map.infoWindow.resize(245,125);

        dialog = new TooltipDialog({
          id: "tooltipDialog",
          style: "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
        });
        dialog.startup();

        var highlightSymbol = new SimpleFillSymbol(
          SimpleFillSymbol.STYLE_SOLID,
          new SimpleLineSymbol(
            SimpleLineSymbol.STYLE_SOLID,
            new Color([255,0,0]), 3
          ),
          new Color([125,125,125,0.35])
        );

        //close the dialog when the mouse leaves the highlight graphic
        map.on("load", function(){
          map.graphics.enableMouseEvents();
          map.graphics.on("mouse-out", closeDialog);
          map.showZoomSlider();
           
        });
         
        //listen for when the onMouseOver event fires on the countiesGraphicsLayer
        //when fired, create a new graphic with the geometry from the event.graphic and add it to the maps graphics layer
        featureLayer.on("mouse-over", function(evt){
          var t = "<b>${STATE_NAME}</b><br><b>${NAME}</b><hr><b>Total Population: </b>${POP2010:NumberFormat}<br>"
            + "<b>Male Population: </b>${MALES:NumberFormat}<br>" + "<b>Female Population: </b>${FEMALES:NumberFormat}<br>" + "<div height=100>Chart may come here</div>";

          var maleCount = evt.graphic.attributes.MALES;
          var femaleCount = evt.graphic.attributes.FEMALES;
          updateChartData(myChart, maleCount, femaleCount);
          var content = esriLang.substitute(evt.graphic.attributes,t);
          var highlightGraphic = new Graphic(evt.graphic.geometry,highlightSymbol);
          map.graphics.add(highlightGraphic);

          dialog.setContent(content);
          domStyle.set(dialog.domNode, "opacity", 0.85);
          dijitPopup.open({
            popup: dialog,
            x: evt.pageX,
            y: evt.pageY
          });    
            
        });

        function closeDialog() {
          map.graphics.clear();
          dijitPopup.close(dialog);
        }
          
        function onButtonClick() { featureLayer.setDefinitionExpression("STATE_NAME = 'North Carolina' AND POP2010 > 50000");
          console.log("OnButtonClick");
        }
        
        var chartCanvas = document.getElementById("chartCanvas");
        chartCanvas.width = 200;
        var myChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: ["Males", "Females"],
                datasets: [{
                    label: 'Male Female Population',
                    data: [ 0, 0],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)'
                        
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true
                        }
                    }]
                }
            }
        });

        function updateChartData(chart, males, females){
            chart.data.datasets[0].data[0]= males;
            chart.data.datasets[0].data[1]= females;
            chart.update();
        }

        var queryMaleFemaleBtn = document.getElementById("queryMaleFemaleBtn");
        queryMaleFemaleBtn.onclick = function(){
          var maleCount = document.getElementById("maleCount").value;
          var femaleCount = document.getElementById("femaleCount").value;
          featureLayer.setDefinitionExpression("STATE_NAME = 'South Carolina' AND MALES >" + maleCount + "AND FEMALES > " + femaleCount);
        }
      });