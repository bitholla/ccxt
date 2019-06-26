// const bi = require('./js/binance');
// const binance = new bi();

// binance.loadMarkets();

// console.log(binance.websocketSubscribe('ob'));

// const so = require('./js/base/websocket/socketio_connection');
// const socket = new so({
//     url: 'https://api.hollaex.com/realtime'
// });
// socket.connect().then(() => {
//     socket.send('orderbook_BTC/EUR');

//     socket.on('message', (data) => {
//         console.log(data);
//         // console.log(JSON.parse(data));
//     })
// }).catch((err) => {
//     console.log(err);
// })

const holla = require('./js/hollaex');
const hollaex = new holla();
async function main () {
    // await bitstamp.loadMarkets();
    // await hollaex.websocketSubscribe('ob', 'BTC/EUR');
    await hollaex.websocketSubscribeAll([{
        'event': 'ob',
        'symbol': 'BTC/EUR'
    }]).catch((e) => {
        console.log(e);
    });
    hollaex.on('ob', (market, ob) => {
        console.log(market, ob);
    })
};
main();