// const io = require('socket.io-client');
// const socket = io('https://api.hollaex.com/realtime');

// socket.on('orderbook', (data) => {
//     console.log(data);
// })

// const bi = require('./js/binance');
// const binance = new bi();

// binance.loadMarkets();

// console.log(binance.websocketSubscribe('ob'));

const so = require('./js/base/websocket/socketio_connection');

const socket = new so({
    url: 'https://api.hollaex.com/realtime'
});

socket.connect().then(() => {
    socket.on('message', (data) => {
        console.log(JSON.parse(data));
    })
}).catch((err) => {
    console.log(err);
})

// const bit = require('./js/bitstamp');
// const bitstamp = new bit();

// async function main () {
//     bitstamp.on('ob', (market, ob) => {
//         console.log(market, ob);
//     })

//     // await bitstamp.loadMarkets();
//     await bitstamp.websocketSubscribe('ob', 'BTC/EUR');

// };

// main();