// const so = require('./js/base/websocket/socketio_connection');
// const socket = new so({
//     url: 'https://api.hollaex.com/realtime'
// });
// socket.connect().then(() => {
//     socket.send({channel: 'trade_BTC/EUR'});

//     socket.on('message', (data) => {
//         console.log(data);
//         // console.log(JSON.parse(data));
//     })
// }).catch((err) => {
//     console.log(err);
// })

// const holla = require('./js/hollaex');
// const hollaex = new holla();
// async function main () {
//     // await bitstamp.loadMarkets();
//     // await hollaex.websocketSubscribe('ob', 'BTC/EUR');
//     await hollaex.websocketSubscribeAll([{
//         'event': 'ob',
//         'symbol': 'BTC/EUR'
//     }]).catch((e) => {
//         console.log(e);
//     });
//     hollaex.on('ob', (market, ob) => {
//         console.log('received');
//         console.log(market, ob);
//     })
// };
// main();

const hollaWeb = require('./js/hollaexx');
const hollaex = new hollaWeb();
async function main () {
    // await bitstamp.loadMarkets();
    // await hollaex.websocketSubscribe('ob', 'BTC/EUR');
    await hollaex.websocketSubscribeAll([{
        'event': 'trade',
        'symbol': 'BTC/EUR'
    }]).catch((e) => {
        console.log(e);
    });
    hollaex.on('trade', (market, ob) => {
        console.log('received');
        console.log(market, ob);
    })

    setTimeout(() => {
        hollaex.websocketUnsubscribe('trade', 'BTC/EUR');
    }, 20000)
};
main();

// const binancee = require('./js/binance');
// const binance = new binancee();
// async function main () {
//     await binance.loadMarkets();
//     // await hollaex.websocketSubscribe('ob', 'BTC/EUR');
//     await binance.websocketSubscribeAll([{
//         'event': 'trade',
//         'symbol': 'BTC/USDT'
//     }]).catch((e) => {
//         console.log(e);
//     });
//     binance.on('trade', (market, ob) => {
//         console.log('received');
//         console.log(market, ob);
//     })

//     setTimeout(() => {
//         binance.websocketUnsubscribe('trade', 'BTC/EUR');
//     }, 10000)
// };
// main();