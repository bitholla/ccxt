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
    {
        'event': 'trade',
        'symbol': 'ETH/EUR'
    }
    ])
    await hollaex.websocketSubscribe ('trade', 'XRP/EUR');
    hollaex.on('trade', (market, trade) => {
        console.log(market, 'trade');
    })

    hollaex.on('ob', (market, ob) => {
        console.log(market, 'ob');
    })

    setTimeout(() => {
        hollaex.websocketUnsubscribe('trade', 'XRP/EUR');
    }, 5000)
};
main();