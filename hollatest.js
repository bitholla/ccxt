const hollaWeb = require('./js/hollaex');
const hollaex = new hollaWeb();
async function main () {
    await hollaex.loadMarkets();
    // await hollaex.websocketSubscribe('ob', 'BTC/EUR');
    await hollaex.websocketSubscribeAll([{
        'event': 'ob',
        'symbol': 'ETH/EUR'
    },
    {
        'event': 'ob',
        'symbol': 'XRP/EUR'
    },
    // {
    //     'event': 'trade',
    //     'symbol': 'XRP/USDT'
    // }
    ])
    hollaex.on('trade', (market, trade) => {
        console.log(market, 'trade');
    })

    hollaex.on('ob', (market, ob) => {
        console.log(market, 'ob');
    })

    setTimeout(() => {
        console.log('triggered');
        hollaex.websocketUnsubscribe ('trade', 'XRP/USDT');
    }, 5000)
};
main();