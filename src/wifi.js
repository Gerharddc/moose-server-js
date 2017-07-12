// @flow

let ssids: Array<string> = [];

/*var connman = require('connman-simplified')();
connman.init(function(err) {
    connman.initWiFi(function(err,wifi,properties) {

        wifi.getNetworks(function(err,list) {
            // get more readable list using getServicesString:
            console.log("networks: ",wifi.getServicesString(list));
        });

    });
});*/

let ConnMan = require('connman-node-api');
var connman = new ConnMan();
connman.init(function(err) {
    if (err instanceof Error) {
        console.log(err.message);
    }
});

/*let ConnMan = require('jsdx-connman');
let connman = new ConnMan();
connman.init(function() {

    let wifi = connman.technologies['WiFi'];

    // Scanning
    console.log('Scanning...');
    wifi.scan(function() {

        // Getting list of access points
        wifi.listAccessPoints(function(err, list) {
            console.log('Got ' + list.length + ' Access Point(s)');
            for (let index in list) {
                let ap = list[index];

                let name = String('                ' + (ap.Name ? ap.Name : '*hidden*')).slice(-16);
                console.log('  ' + name, '  Strength: ' + ap.Strength + '%', '  Security: ' + ap.Security);
            }

            process.exit();
        });
    });

});
console.log("did connman");*/

export function getSSIDS() {
    return ssids;
}

export function scanWifi() {
    console.log('Called for scan');
}

export function connectSSID(ssid: string) {
    // TODO
}