'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { AuthenticationError, ExchangeError, NotSupported, PermissionDenied, InvalidNonce, OrderNotFound, InsufficientFunds, InvalidAddress } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class bitstamp extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bitstamp',
            'name': 'Bitstamp',
            'countries': [ 'GB' ],
            'rateLimit': 1000,
            'version': 'v2',
            'has': {
                'CORS': true,
                'fetchDepositAddress': true,
                'fetchOrder': 'emulated',
                'fetchOpenOrders': true,
                'fetchMyTrades': true,
                'fetchTransactions': true,
                'fetchWithdrawals': true,
                'withdraw': true,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27786377-8c8ab57e-5fe9-11e7-8ea4-2b05b6bcceec.jpg',
                'api': 'https://www.bitstamp.net/api',
                'www': 'https://www.bitstamp.net',
                'doc': 'https://www.bitstamp.net/api',
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': true,
                'uid': true,
            },
            'api': {
                'public': {
                    'get': [
                        'order_book/{pair}/',
                        'ticker_hour/{pair}/',
                        'ticker/{pair}/',
                        'transactions/{pair}/',
                        'trading-pairs-info/',
                    ],
                },
                'private': {
                    'post': [
                        'balance/',
                        'balance/{pair}/',
                        'bch_withdrawal/',
                        'bch_address/',
                        'user_transactions/',
                        'user_transactions/{pair}/',
                        'open_orders/all/',
                        'open_orders/{pair}/',
                        'order_status/',
                        'cancel_order/',
                        'buy/{pair}/',
                        'buy/market/{pair}/',
                        'buy/instant/{pair}/',
                        'sell/{pair}/',
                        'sell/market/{pair}/',
                        'sell/instant/{pair}/',
                        'ltc_withdrawal/',
                        'ltc_address/',
                        'eth_withdrawal/',
                        'eth_address/',
                        'xrp_withdrawal/',
                        'xrp_address/',
                        'transfer-to-main/',
                        'transfer-from-main/',
                        'withdrawal-requests/',
                        'withdrawal/open/',
                        'withdrawal/status/',
                        'withdrawal/cancel/',
                        'liquidation_address/new/',
                        'liquidation_address/info/',
                    ],
                },
                'v1': {
                    'post': [
                        'bitcoin_deposit_address/',
                        'unconfirmed_btc/',
                        'bitcoin_withdrawal/',
                        'ripple_withdrawal/',
                        'ripple_address/',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': 0.25 / 100,
                    'maker': 0.25 / 100,
                    'tiers': {
                        'taker': [
                            [0, 0.25 / 100],
                            [20000, 0.24 / 100],
                            [100000, 0.22 / 100],
                            [400000, 0.20 / 100],
                            [600000, 0.15 / 100],
                            [1000000, 0.14 / 100],
                            [2000000, 0.13 / 100],
                            [4000000, 0.12 / 100],
                            [20000000, 0.11 / 100],
                            [20000001, 0.10 / 100],
                        ],
                        'maker': [
                            [0, 0.25 / 100],
                            [20000, 0.24 / 100],
                            [100000, 0.22 / 100],
                            [400000, 0.20 / 100],
                            [600000, 0.15 / 100],
                            [1000000, 0.14 / 100],
                            [2000000, 0.13 / 100],
                            [4000000, 0.12 / 100],
                            [20000000, 0.11 / 100],
                            [20000001, 0.10 / 100],
                        ],
                    },
                },
                'funding': {
                    'tierBased': false,
                    'percentage': false,
                    'withdraw': {
                        'BTC': 0,
                        'BCH': 0,
                        'LTC': 0,
                        'ETH': 0,
                        'XRP': 0,
                        'USD': 25,
                        'EUR': 0.90,
                    },
                    'deposit': {
                        'BTC': 0,
                        'BCH': 0,
                        'LTC': 0,
                        'ETH': 0,
                        'XRP': 0,
                        'USD': 25,
                        'EUR': 0,
                    },
                },
            },
            'exceptions': {
                'exact': {
                    'No permission found': PermissionDenied,
                    'API key not found': AuthenticationError,
                    'IP address not allowed': PermissionDenied,
                    'Invalid nonce': InvalidNonce,
                    'Invalid signature': AuthenticationError,
                    'Authentication failed': AuthenticationError,
                    'Missing key, signature and nonce parameters': AuthenticationError,
                    'Your account is frozen': PermissionDenied,
                    'Please update your profile with your FATCA information, before using API.': PermissionDenied,
                    'Order not found': OrderNotFound,
                },
                'broad': {
                    'Check your account balance for details.': InsufficientFunds, // You have only 0.00100000 BTC available. Check your account balance for details.
                    'Ensure this value has at least': InvalidAddress, // Ensure this value has at least 25 characters (it has 4).
                },
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'pusher',
                        'baseurl': 'wss://ws-mt1.pusher.com:443/app/de504dc5763aeef9ff52',
                    },
                },
                'methodmap': {
                    '_websocketTimeoutRemoveNonce': '_websocketTimeoutRemoveNonce',
                },
                'events': {
                    'ob': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                    'trade': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                },
            },
        });
    }

    async fetchMarkets (params = {}) {
        let markets = await this.publicGetTradingPairsInfo ();
        let result = [];
        for (let i = 0; i < markets.length; i++) {
            let market = markets[i];
            let symbol = market['name'];
            let [ base, quote ] = symbol.split ('/');
            let baseId = base.toLowerCase ();
            let quoteId = quote.toLowerCase ();
            let symbolId = baseId + '_' + quoteId;
            let id = market['url_symbol'];
            let precision = {
                'amount': market['base_decimals'],
                'price': market['counter_decimals'],
            };
            let parts = market['minimum_order'].split (' ');
            let cost = parts[0];
            // let [ cost, currency ] = market['minimum_order'].split (' ');
            let active = (market['trading'] === 'Enabled');
            result.push ({
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'symbolId': symbolId,
                'info': market,
                'active': active,
                'precision': precision,
                'limits': {
                    'amount': {
                        'min': Math.pow (10, -precision['amount']),
                        'max': undefined,
                    },
                    'price': {
                        'min': Math.pow (10, -precision['price']),
                        'max': undefined,
                    },
                    'cost': {
                        'min': parseFloat (cost),
                        'max': undefined,
                    },
                },
            });
        }
        return result;
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let orderbook = await this.publicGetOrderBookPair (this.extend ({
            'pair': this.marketId (symbol),
        }, params));
        let timestamp = parseInt (orderbook['timestamp']) * 1000;
        return this.parseOrderBook (orderbook, timestamp);
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let ticker = await this.publicGetTickerPair (this.extend ({
            'pair': this.marketId (symbol),
        }, params));
        let timestamp = parseInt (ticker['timestamp']) * 1000;
        let vwap = this.safeFloat (ticker, 'vwap');
        let baseVolume = this.safeFloat (ticker, 'volume');
        let quoteVolume = undefined;
        if (baseVolume !== undefined && vwap !== undefined)
            quoteVolume = baseVolume * vwap;
        let last = this.safeFloat (ticker, 'last');
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeFloat (ticker, 'high'),
            'low': this.safeFloat (ticker, 'low'),
            'bid': this.safeFloat (ticker, 'bid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'ask'),
            'askVolume': undefined,
            'vwap': vwap,
            'open': this.safeFloat (ticker, 'open'),
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
            'info': ticker,
        };
    }

    getCurrencyIdFromTransaction (transaction) {
        //
        //     {
        //         "fee": "0.00000000",
        //         "btc_usd": "0.00",
        //         "datetime": XXX,
        //         "usd": 0.0,
        //         "btc": 0.0,
        //         "eth": "0.05000000",
        //         "type": "0",
        //         "id": XXX,
        //         "eur": 0.0
        //     }
        //
        if ('currency' in transaction) {
            return transaction['currency'].toLowerCase ();
        }
        transaction = this.omit (transaction, [
            'fee',
            'price',
            'datetime',
            'type',
            'status',
            'id',
        ]);
        let ids = Object.keys (transaction);
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i];
            if (id.indexOf ('_') < 0) {
                let value = this.safeFloat (transaction, id);
                if ((value !== undefined) && (value !== 0)) {
                    return id;
                }
            }
        }
        return undefined;
    }

    getMarketFromTrade (trade) {
        trade = this.omit (trade, [
            'fee',
            'price',
            'datetime',
            'tid',
            'type',
            'order_id',
            'side',
        ]);
        let currencyIds = Object.keys (trade);
        let numCurrencyIds = currencyIds.length;
        if (numCurrencyIds > 2) {
            throw new ExchangeError (this.id + ' getMarketFromTrade too many keys: ' + this.json (currencyIds) + ' in the trade: ' + this.json (trade));
        }
        if (numCurrencyIds === 2) {
            let marketId = currencyIds[0] + currencyIds[1];
            if (marketId in this.markets_by_id)
                return this.markets_by_id[marketId];
            marketId = currencyIds[1] + currencyIds[0];
            if (marketId in this.markets_by_id)
                return this.markets_by_id[marketId];
        }
        return undefined;
    }

    getMarketFromTrades (trades) {
        let tradesBySymbol = this.indexBy (trades, 'symbol');
        let symbols = Object.keys (tradesBySymbol);
        let numSymbols = symbols.length;
        if (numSymbols === 1) {
            return this.markets[symbols[0]];
        }
        return undefined;
    }

    parseTrade (trade, market = undefined) {
        //
        // fetchTrades (public)
        //
        //     {
        //         date: '1551814435',
        //         tid: '83581898',
        //         price: '0.03532850',
        //         type: '1',
        //         amount: '0.85945907'
        //     },
        //
        // fetchMyTrades, trades returned within fetchOrder (private)
        //
        //     {
        //         "usd": "6.0134400000000000",
        //         "price": "4008.96000000",
        //         "datetime": "2019-03-28 23:07:37.233599",
        //         "fee": "0.02",
        //         "btc": "0.00150000",
        //         "tid": 84452058,
        //         "type": 2
        //     }
        //
        const id = this.safeString2 (trade, 'id', 'tid');
        let symbol = undefined;
        let side = undefined;
        let price = this.safeFloat (trade, 'price');
        let amount = this.safeFloat (trade, 'amount');
        let orderId = this.safeString (trade, 'order_id');
        let type = undefined;
        let cost = this.safeFloat (trade, 'cost');
        if (market === undefined) {
            let keys = Object.keys (trade);
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].indexOf ('_') >= 0) {
                    let marketId = keys[i].replace ('_', '');
                    if (marketId in this.markets_by_id)
                        market = this.markets_by_id[marketId];
                }
            }
            // if the market is still not defined
            // try to deduce it from used keys
            if (market === undefined) {
                market = this.getMarketFromTrade (trade);
            }
        }
        let feeCost = this.safeFloat (trade, 'fee');
        let feeCurrency = undefined;
        if (market !== undefined) {
            price = this.safeFloat (trade, market['symbolId'], price);
            amount = this.safeFloat (trade, market['baseId'], amount);
            cost = this.safeFloat (trade, market['quoteId'], cost);
            feeCurrency = market['quote'];
            symbol = market['symbol'];
        }
        let timestamp = this.safeString2 (trade, 'date', 'datetime');
        if (timestamp !== undefined) {
            if (timestamp.indexOf (' ') >= 0) {
                // iso8601
                timestamp = this.parse8601 (timestamp);
            } else {
                // string unix epoch in seconds
                timestamp = parseInt (timestamp);
                timestamp = timestamp * 1000;
            }
        }
        // if it is a private trade
        if ('id' in trade) {
            if (amount !== undefined) {
                if (amount < 0) {
                    side = 'sell';
                    amount = -amount;
                } else {
                    side = 'buy';
                }
            }
        } else {
            side = this.safeString (trade, 'type');
            if (side === '1') {
                side = 'sell';
            } else if (side === '0') {
                side = 'buy';
            }
        }
        if (cost === undefined) {
            if (price !== undefined) {
                if (amount !== undefined) {
                    cost = price * amount;
                }
            }
        }
        if (cost !== undefined) {
            cost = Math.abs (cost);
        }
        let fee = undefined;
        if (feeCost !== undefined) {
            fee = {
                'cost': feeCost,
                'currency': feeCurrency,
            };
        }
        return {
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'order': orderId,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetTransactionsPair (this.extend ({
            'pair': market['id'],
            'time': 'hour',
        }, params));
        //
        //     [
        //         {
        //             date: '1551814435',
        //             tid: '83581898',
        //             price: '0.03532850',
        //             type: '1',
        //             amount: '0.85945907'
        //         },
        //         {
        //             date: '1551814434',
        //             tid: '83581896',
        //             price: '0.03532851',
        //             type: '1',
        //             amount: '11.34130961'
        //         },
        //     ]
        //
        return this.parseTrades (response, market, since, limit);
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let balance = await this.privatePostBalance ();
        let result = { 'info': balance };
        let currencies = Object.keys (this.currencies);
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            let lowercase = currency.toLowerCase ();
            let total = lowercase + '_balance';
            let free = lowercase + '_available';
            let used = lowercase + '_reserved';
            let account = this.account ();
            if (free in balance)
                account['free'] = parseFloat (balance[free]);
            if (used in balance)
                account['used'] = parseFloat (balance[used]);
            if (total in balance)
                account['total'] = parseFloat (balance[total]);
            result[currency] = account;
        }
        return this.parseBalance (result);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let method = 'privatePost' + this.capitalize (side);
        let request = {
            'pair': market['id'],
            'amount': this.amountToPrecision (symbol, amount),
        };
        if (type === 'market') {
            method += 'Market';
        } else {
            request['price'] = this.priceToPrecision (symbol, price);
        }
        method += 'Pair';
        let response = await this[method] (this.extend (request, params));
        let order = this.parseOrder (response, market);
        return this.extend (order, {
            'type': type,
        });
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        return await this.privatePostCancelOrder ({ 'id': id });
    }

    parseOrderStatus (status) {
        let statuses = {
            'In Queue': 'open',
            'Open': 'open',
            'Finished': 'closed',
            'Canceled': 'canceled',
        };
        return (status in statuses) ? statuses[status] : status;
    }

    async fetchOrderStatus (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        const request = { 'id': id };
        const response = await this.privatePostOrderStatus (this.extend (request, params));
        return this.parseOrderStatus (this.safeString (response, 'status'));
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
        }
        const request = { 'id': id };
        const response = await this.privatePostOrderStatus (this.extend (request, params));
        //
        //     {
        //         "status": "Finished",
        //         "id": 3047704374,
        //         "transactions": [
        //             {
        //                 "usd": "6.0134400000000000",
        //                 "price": "4008.96000000",
        //                 "datetime": "2019-03-28 23:07:37.233599",
        //                 "fee": "0.02",
        //                 "btc": "0.00150000",
        //                 "tid": 84452058,
        //                 "type": 2
        //             }
        //         ]
        //     }
        return this.parseOrder (response, market);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        let method = 'privatePostUserTransactions';
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['pair'] = market['id'];
            method += 'Pair';
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let response = await this[method] (this.extend (request, params));
        let result = this.filterBy (response, 'type', '2');
        return this.parseTrades (result, market, since, limit);
    }

    async fetchTransactions (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let response = await this.privatePostUserTransactions (this.extend (request, params));
        //
        //     [
        //         {
        //             "fee": "0.00000000",
        //             "btc_usd": "0.00",
        //             "id": 1234567894,
        //             "usd": 0,
        //             "btc": 0,
        //             "datetime": "2018-09-08 09:00:31",
        //             "type": "1",
        //             "xrp": "-20.00000000",
        //             "eur": 0,
        //         },
        //         {
        //             "fee": "0.00000000",
        //             "btc_usd": "0.00",
        //             "id": 1134567891,
        //             "usd": 0,
        //             "btc": 0,
        //             "datetime": "2018-09-07 18:47:52",
        //             "type": "0",
        //             "xrp": "20.00000000",
        //             "eur": 0,
        //         },
        //     ]
        //
        let currency = undefined;
        if (code !== undefined) {
            currency = this.currency (code);
        }
        let transactions = this.filterByArray (response, 'type', [ '0', '1' ], false);
        return this.parseTransactions (transactions, currency, since, limit);
    }

    async fetchWithdrawals (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        if (since !== undefined) {
            request['timedelta'] = this.milliseconds () - since;
        }
        let response = await this.privatePostWithdrawalRequests (this.extend (request, params));
        //
        //     [
        //         {
        //             status: 2,
        //             datetime: '2018-10-17 10:58:13',
        //             currency: 'BTC',
        //             amount: '0.29669259',
        //             address: 'aaaaa',
        //             type: 1,
        //             id: 111111,
        //             transaction_id: 'xxxx',
        //         },
        //         {
        //             status: 2,
        //             datetime: '2018-10-17 10:55:17',
        //             currency: 'ETH',
        //             amount: '1.11010664',
        //             address: 'aaaa',
        //             type: 16,
        //             id: 222222,
        //             transaction_id: 'xxxxx',
        //         },
        //     ]
        //
        return this.parseTransactions (response, undefined, since, limit);
    }

    parseTransaction (transaction, currency = undefined) {
        //
        // fetchTransactions
        //
        //     {
        //         "fee": "0.00000000",
        //         "btc_usd": "0.00",
        //         "id": 1234567894,
        //         "usd": 0,
        //         "btc": 0,
        //         "datetime": "2018-09-08 09:00:31",
        //         "type": "1",
        //         "xrp": "-20.00000000",
        //         "eur": 0,
        //     }
        //
        // fetchWithdrawals
        //
        //     {
        //         status: 2,
        //         datetime: '2018-10-17 10:58:13',
        //         currency: 'BTC',
        //         amount: '0.29669259',
        //         address: 'aaaaa',
        //         type: 1,
        //         id: 111111,
        //         transaction_id: 'xxxx',
        //     }
        //
        let timestamp = this.parse8601 (this.safeString (transaction, 'datetime'));
        let code = undefined;
        let id = this.safeString (transaction, 'id');
        let currencyId = this.getCurrencyIdFromTransaction (transaction);
        if (currencyId in this.currencies_by_id) {
            currency = this.currencies_by_id[currencyId];
        } else if (currencyId !== undefined) {
            code = currencyId.toUpperCase ();
            code = this.commonCurrencyCode (code);
        }
        let feeCost = this.safeFloat (transaction, 'fee');
        let feeCurrency = undefined;
        let amount = undefined;
        if (currency !== undefined) {
            amount = this.safeFloat (transaction, currency['id'], amount);
            feeCurrency = currency['code'];
            code = currency['code'];
        } else if ((code !== undefined) && (currencyId !== undefined)) {
            amount = this.safeFloat (transaction, currencyId, amount);
            feeCurrency = code;
        }
        if (amount !== undefined) {
            // withdrawals have a negative amount
            amount = Math.abs (amount);
        }
        let status = this.parseTransactionStatusByType (this.safeString (transaction, 'status'));
        let type = this.safeString (transaction, 'type');
        if (status === undefined) {
            if (type === '0') {
                type = 'deposit';
            } else if (type === '1') {
                type = 'withdrawal';
            }
        } else {
            type = 'withdrawal';
        }
        let txid = this.safeString (transaction, 'transaction_id');
        let address = this.safeString (transaction, 'address');
        let tag = undefined; // not documented
        return {
            'info': transaction,
            'id': id,
            'txid': txid,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'address': address,
            'tag': tag,
            'type': type,
            'amount': amount,
            'currency': code,
            'status': status,
            'updated': undefined,
            'fee': {
                'currency': feeCurrency,
                'cost': feeCost,
                'rate': undefined,
            },
        };
    }

    parseTransactionStatusByType (status) {
        // withdrawals:
        // 0 (open), 1 (in process), 2 (finished), 3 (canceled) or 4 (failed).
        const statuses = {
            '0': 'pending', // Open
            '1': 'pending', // In process
            '2': 'ok', // Finished
            '3': 'canceled', // Canceled
            '4': 'failed', // Failed
        };
        return this.safeString (statuses, status, status);
    }

    parseOrder (order, market = undefined) {
        //
        //     {
        //         price: '0.00008012',
        //         currency_pair: 'XRP/BTC',
        //         datetime: '2019-01-31 21:23:36',
        //         amount: '15.00000000',
        //         type: '0',
        //         id: '2814205012'
        //     }
        //
        let id = this.safeString (order, 'id');
        let side = this.safeString (order, 'type');
        if (side !== undefined) {
            side = (side === '1') ? 'sell' : 'buy';
        }
        let timestamp = this.parse8601 (this.safeString (order, 'datetime'));
        let symbol = undefined;
        let marketId = this.safeString (order, 'currency_pair');
        if (marketId !== undefined) {
            marketId = marketId.replace ('/', '');
            marketId = marketId.toLowerCase ();
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
                symbol = market['symbol'];
            }
        }
        let amount = this.safeFloat (order, 'amount');
        let filled = 0.0;
        let trades = [];
        let transactions = this.safeValue (order, 'transactions');
        let feeCost = undefined;
        let cost = undefined;
        if (transactions !== undefined) {
            if (Array.isArray (transactions)) {
                feeCost = 0.0;
                for (let i = 0; i < transactions.length; i++) {
                    let trade = this.parseTrade (this.extend ({
                        'order_id': id,
                        'side': side,
                    }, transactions[i]), market);
                    filled += trade['amount'];
                    feeCost += trade['fee']['cost'];
                    if (cost === undefined)
                        cost = 0.0;
                    cost += trade['cost'];
                    trades.push (trade);
                }
            }
        }
        let status = this.parseOrderStatus (this.safeString (order, 'status'));
        if ((status === 'closed') && (amount === undefined)) {
            amount = filled;
        }
        let remaining = undefined;
        if (amount !== undefined) {
            remaining = amount - filled;
        }
        let price = this.safeFloat (order, 'price');
        if (market === undefined) {
            market = this.getMarketFromTrades (trades);
        }
        let feeCurrency = undefined;
        if (market !== undefined) {
            if (symbol === undefined) {
                symbol = market['symbol'];
            }
            feeCurrency = market['quote'];
        }
        if (cost === undefined) {
            if (price !== undefined) {
                cost = price * filled;
            }
        } else if (price === undefined) {
            if (filled > 0) {
                price = cost / filled;
            }
        }
        let fee = undefined;
        if (feeCost !== undefined) {
            if (feeCurrency !== undefined) {
                fee = {
                    'cost': feeCost,
                    'currency': feeCurrency,
                };
            }
        }
        return {
            'id': id,
            'datetime': this.iso8601 (timestamp),
            'timestamp': timestamp,
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': undefined,
            'side': side,
            'price': price,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'trades': trades,
            'fee': fee,
            'info': order,
        };
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        let market = undefined;
        await this.loadMarkets ();
        if (symbol !== undefined) {
            market = this.market (symbol);
        }
        const response = await this.privatePostOpenOrdersAll (params);
        //     [
        //         {
        //             price: '0.00008012',
        //             currency_pair: 'XRP/BTC',
        //             datetime: '2019-01-31 21:23:36',
        //             amount: '15.00000000',
        //             type: '0',
        //             id: '2814205012',
        //         }
        //     ]
        //
        const result = [];
        for (let i = 0; i < response.length; i++) {
            const order = this.parseOrder (response[i], market);
            result.push (this.extend (order, {
                'status': 'open',
                'type': 'limit',
            }));
        }
        if (symbol === undefined) {
            return this.filterBySinceLimit (result, since, limit);
        }
        return this.filterBySymbolSinceLimit (result, symbol, since, limit);
    }

    getCurrencyName (code) {
        if (code === 'BTC')
            return 'bitcoin';
        return code.toLowerCase ();
    }

    isFiat (code) {
        if (code === 'USD')
            return true;
        if (code === 'EUR')
            return true;
        return false;
    }

    async fetchDepositAddress (code, params = {}) {
        if (this.isFiat (code))
            throw new NotSupported (this.id + ' fiat fetchDepositAddress() for ' + code + ' is not implemented yet');
        let name = this.getCurrencyName (code);
        let v1 = (code === 'BTC');
        let method = v1 ? 'v1' : 'private'; // v1 or v2
        method += 'Post' + this.capitalize (name);
        method += v1 ? 'Deposit' : '';
        method += 'Address';
        let response = await this[method] (params);
        let address = v1 ? response : this.safeString (response, 'address');
        let tag = v1 ? undefined : this.safeString (response, 'destination_tag');
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'tag': tag,
            'info': response,
        };
    }

    async withdraw (code, amount, address, tag = undefined, params = {}) {
        this.checkAddress (address);
        if (this.isFiat (code))
            throw new NotSupported (this.id + ' fiat withdraw() for ' + code + ' is not implemented yet');
        let name = this.getCurrencyName (code);
        let request = {
            'amount': amount,
            'address': address,
        };
        let v1 = (code === 'BTC');
        let method = v1 ? 'v1' : 'private'; // v1 or v2
        method += 'Post' + this.capitalize (name) + 'Withdrawal';
        let query = params;
        if (code === 'XRP') {
            if (tag !== undefined) {
                request['destination_tag'] = tag;
                query = this.omit (params, 'destination_tag');
            } else {
                throw new ExchangeError (this.id + ' withdraw() requires a destination_tag param for ' + code);
            }
        }
        let response = await this[method] (this.extend (request, query));
        return {
            'info': response,
            'id': response['id'],
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'] + '/';
        if (api !== 'v1')
            url += this.version + '/';
        url += this.implodeParams (path, params);
        let query = this.omit (params, this.extractParams (path));
        if (api === 'public') {
            if (Object.keys (query).length)
                url += '?' + this.urlencode (query);
        } else {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ().toString ();
            let auth = nonce + this.uid + this.apiKey;
            let signature = this.encode (this.hmac (this.encode (auth), this.encode (this.secret)));
            query = this.extend ({
                'key': this.apiKey,
                'signature': signature.toUpperCase (),
                'nonce': nonce,
            }, query);
            body = this.urlencode (query);
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (httpCode, reason, url, method, headers, body, response) {
        if (response === undefined) {
            return;
        }
        // fetchDepositAddress returns {"error": "No permission found"} on apiKeys that don't have the permission required
        const status = this.safeString (response, 'status');
        const error = this.safeValue (response, 'error');
        if (status === 'error' || error) {
            let errors = [];
            if (typeof error === 'string') {
                errors.push (error);
            } else {
                const keys = Object.keys (error);
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    const value = this.safeValue (error, key);
                    if (Array.isArray (value)) {
                        errors = this.arrayConcat (errors, value);
                    } else {
                        errors.push (value);
                    }
                }
            }
            const reason = this.safeValue (response, 'reason', {});
            const all = this.safeValue (reason, '__all__');
            if (all !== undefined) {
                if (Array.isArray (all)) {
                    for (let i = 0; i < all.length; i++) {
                        errors.push (all[i]);
                    }
                }
            }
            const code = this.safeString (response, 'code');
            if (code === 'API0005') {
                throw new AuthenticationError (this.id + ' invalid signature, use the uid for the main account if you have subaccounts');
            }
            const exact = this.exceptions['exact'];
            const broad = this.exceptions['broad'];
            const feedback = this.id + ' ' + body;
            for (let i = 0; i < errors.length; i++) {
                const value = errors[i];
                if (value in exact) {
                    throw new exact[value] (feedback);
                }
                const broadKey = this.findBroadlyMatchedKey (broad, value);
                if (broadKey !== undefined) {
                    throw new broad[broadKey] (feedback);
                }
            }
            throw new ExchangeError (feedback);
        }
    }

    _websocketOnMessage (contextId, data) {
        let msg = JSON.parse (data);
        // console.log(data);
        let evt = this.safeString (msg, 'event');
        if (evt === 'subscription_succeeded') {
            this._websocketHandleSubscription (contextId, msg);
        } else if (evt === 'data') {
            let chan = this.safeString (msg, 'channel');
            if (chan.indexOf ('order_book') >= 0) {
                this._websocketHandleOrderbook (contextId, msg);
            }
        } else if (evt === 'trade') {
            this._websocketHandleTrade (contextId, msg);
        }
    }

    _websocketHandleOrderbook (contextId, msg) {
        let chan = this.safeString (msg, 'channel');
        let parts = chan.split ('_');
        let id = 'btcusd';
        if (parts.length > 2) {
            id = parts[2];
        }
        let symbol = this.findSymbol (id);
        let data = this.safeValue (msg, 'data');
        let timestamp = this.safeInteger (data, 'timestamp');
        let ob = this.parseOrderBook (data, timestamp * 1000);
        let symbolData = this._contextGetSymbolData (contextId, 'ob', symbol);
        symbolData['ob'] = ob;
        this.emit ('ob', symbol, this._cloneOrderBook (ob, symbolData['limit']));
        this._contextSetSymbolData (contextId, 'ob', symbol, symbolData);
    }

    _websocketParseTrade (data, symbol) {
        let timestamp_ms = parseInt (this.safeInteger (data, 'microtimestamp') / 1000);
        let side = this.safeString (data, 'type');
        if (side !== undefined) {
            side = (side === '1') ? 'sell' : 'buy';
        }
        return {
            'id': this.safeString (data, 'id'),
            'info': data,
            'timestamp': timestamp_ms,
            'datetime': this.iso8601 (timestamp_ms),
            'symbol': symbol,
            'type': undefined,
            'side': side,
            'price': this.safeFloat (data, 'price'),
            'amount': this.safeFloat (data, 'amount'),
        };
    }

    _websocketHandleTrade (contextId, msg) {
        // msg example: {'event': 'trade', 'channel': 'live_trades_btceur', 'data': {'microtimestamp': '1551914592860723', 'amount': 0.06388482, 'buy_order_id': 2967695978, 'sell_order_id': 2967695603, 'amount_str': '0.06388482', 'price_str': '3407.43', 'timestamp': '1551914592', 'price': 3407.43, 'type': 0, 'id': 83631877}}
        let chan = this.safeString (msg, 'channel');
        let parts = chan.split ('_');
        let id = 'btcusd';
        if (parts.length > 2) {
            id = parts[2];
        }
        let symbol = this.findSymbol (id);
        let data = this.safeValue (msg, 'data');
        let trade = this._websocketParseTrade (data, symbol);
        this.emit ('trade', symbol, trade);
    }

    _websocketHandleSubscription (contextId, msg) {
        let chan = this.safeString (msg, 'channel');
        let event = undefined;
        if (chan.indexOf ('order_book') >= 0) {
            event = 'ob';
        } else if (chan.indexOf ('live_trades') >= 0) {
            event = 'trade';
        } else {
            event = undefined;
        }
        if (typeof event !== 'undefined') {
            let parts = chan.split ('_');
            let id = 'btcusd';
            if (parts.length > 2) {
                id = parts[2];
            }
            let symbol = this.findSymbol (id);
            let symbolData = this._contextGetSymbolData (contextId, event, symbol);
            if ('sub-nonces' in symbolData) {
                let nonces = symbolData['sub-nonces'];
                const keys = Object.keys (nonces);
                for (let i = 0; i < keys.length; i++) {
                    let nonce = keys[i];
                    this._cancelTimeout (nonces[nonce]);
                    this.emit (nonce, true);
                }
                symbolData['sub-nonces'] = {};
                this._contextSetSymbolData (contextId, event, symbol, symbolData);
            }
        }
    }

    _websocketSubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob' && event !== 'trade') {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        // save nonce for subscription response
        let symbolData = this._contextGetSymbolData (contextId, event, symbol);
        if (!('sub-nonces' in symbolData)) {
            symbolData['sub-nonces'] = {};
        }
        symbolData['limit'] = this.safeInteger (params, 'limit', undefined);
        let nonceStr = nonce.toString ();
        let handle = this._setTimeout (contextId, this.timeout, this._websocketMethodMap ('_websocketTimeoutRemoveNonce'), [contextId, nonceStr, event, symbol, 'sub-nonce']);
        let channel = undefined;
        symbolData['sub-nonces'][nonceStr] = handle;
        this._contextSetSymbolData (contextId, event, symbol, symbolData);
        // send request
        if (event === 'ob') {
            channel = 'order_book';
        } else if (event === 'trade') {
            channel = 'live_trades';
        }
        if (symbol !== 'BTC/USD') {
            const id = this.marketId (symbol);
            channel = channel + '_' + id;
        }
        this.websocketSendJson ({
            'event': 'subscribe',
            'channel': channel,
        }, contextId);
    }

    _websocketUnsubscribe (contextId, event, symbol, nonce, params = {}) {
        let channel = undefined;
        if (event !== 'ob' && event !== 'trade') {
            throw new NotSupported ('unsubscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        if (event === 'ob') {
            channel = 'order_book';
        } else if (event === 'trade') {
            channel = 'live_trades';
        }
        if (symbol !== 'BTC/USD') {
            const id = this.marketId (symbol);
            channel = channel + '_' + id;
        }
        this.websocketSendJson ({
            'event': 'unsubscribe',
            'channel': channel,
        });
        let nonceStr = nonce.toString ();
        this.emit (nonceStr, true);
    }

    _websocketTimeoutRemoveNonce (contextId, timerNonce, event, symbol, key) {
        let symbolData = this._contextGetSymbolData (contextId, event, symbol);
        if (key in symbolData) {
            let nonces = symbolData[key];
            if (timerNonce in nonces) {
                this.omit (symbolData[key], timerNonce);
                this._contextSetSymbolData (contextId, event, symbol, symbolData);
            }
        }
    }

    _getCurrentWebsocketOrderbook (contextId, symbol, limit) {
        let data = this._contextGetSymbolData (contextId, 'ob', symbol);
        if (('ob' in data) && (typeof data['ob'] !== 'undefined')) {
            return this._cloneOrderBook (data['ob'], limit);
        }
        return undefined;
    }
};
