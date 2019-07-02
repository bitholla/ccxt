const hollaWeb = require('./js/hollaex');
const hollaex = new hollaWeb();
async function main () {
    await hollaex.loadMarkets();
    // await hollaex.websocketSubscribe('ob', 'BTC/EUR');
    await hollaex.websocketSubscribeAll([{
        'event': 'ob',
        'symbol': 'BTC/EUR'
    },
    {
        'event': 'ob',
        'symbol': 'XRP/EUR'
    },
    // {
    //     'event': 'trade',
    //     'symbol': 'XRP/EUR'
    // }
    ])
    await hollaex.websocketSubscribe ('trade', 'XRP/EUR');
    await hollaex.websocketSubscribe ('trade', 'XRP/EUR');
    hollaex.on('trade', (market, trade) => {
        console.log(market, trade);
    })

    // setTimeout(() => {
    //     hollaex.websocketUnsubscribe('trade', 'BTC/EUR');
    // }, 20000)
};
main();