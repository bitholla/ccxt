'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { BadRequest, AuthenticationError, ExchangeError, NetworkError, ArgumentsRequired, OrderNotFound, NotSupported } = require ('./base/errors');
const io = require('socket.io-client');

//  ---------------------------------------------------------------------------

module.exports = class hollaex extends Exchange {
    constuctor () {
        this.subscriptions = {
            'ob': [],
            'trade': [],
        }
        this.socket = undefined;
    }

    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'hollaex',
            'name': 'HollaEx',
            'countries': [ 'KR' ],
            'rateLimit': 333,
            'version': 'v0',
            'has': {
                'CORS': false,
                'fetchMarkets': true,
                'fetchTicker': true,
                'fetchTickers': true,
                'fetchOrderBook': true,
                'fetchTrades': true,
                'fetchOHLCV': true,
                'fetchBalance': true,
                'createOrder': true,
                'createLimitBuyOrder': true,
                'createLimitSellOrder': true,
                'createMarketBuyOrder': true,
                'createMarketSellOrder': true,
                'cancelOrder': true,
                'fetchOpenOrders': true,
                'fetchOrder': true,
                'fetchDeposits': true,
                'fetchWithdrawals': true,
                'fetchOrders': true,
                'fetchMyTrades': true,
                'withdraw': true,
                'fetchDepositAddress': true,
            },
            'timeframes': {
                '1h': '1h',
                '1d': '1d',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/10441291/59487066-8058b500-8eb6-11e9-82fd-c9157b18c2d8.jpg',
                'api': 'https://api.hollaex.com',
                'www': 'https://hollaex.com',
                'doc': 'https://apidocs.hollaex.com',
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': false,
            },
            'api': {
                'public': {
                    'get': [
                        'ticker',
                        'ticker/all',
                        'orderbooks',
                        'trades',
                        'constant',
                        'chart',
                    ],
                },
                'private': {
                    'get': [
                        'user',
                        'user/balance',
                        'user/trades',
                        'user/orders',
                        'user/orders/{orderId}',
                        'user/deposits',
                        'user/withdrawals',
                    ],
                    'post': [
                        'user/request-withdrawal',
                        'order',
                    ],
                    'delete': [
                        'user/orders/{orderId}',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                },
            },
            'exceptions': {
                'Order not found': OrderNotFound,
                '400': BadRequest,
                '403': AuthenticationError,
                '404': BadRequest,
                '405': BadRequest,
                '410': BadRequest,
                '429': BadRequest,
                '500': NetworkError,
                '503': NetworkError,
            },
            'fullCurrencies': {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'BCH': 'bitcoincash',
                'XRP': 'ripple',
            },
        });
    }

    async fetchMarkets (params = {}) {
        let response = await this.publicGetConstant ();
        let markets = this.safeValue (response, 'pairs');
        let keys = Object.keys (markets);
        let result = [];
        for (let i = 0; i < keys.length; i++) {
            let id = keys[i];
            let market = markets[id];
            let baseId = market['pair_base'];
            let quoteId = market['pair_2'];
            let tickSize = market['tick_size'];
            let pricePrecision = 0;
            for (let i = 1; i >= 0 && tickSize < 1; i++) {
                tickSize = tickSize * 10;
                pricePrecision = i;
            }
            let minAmount = market['min_size'];
            let amountPrecision = 0;
            for (let i = 1; i >= 0 && minAmount < 1; i++) {
                minAmount = minAmount * 10;
                amountPrecision = i;
            }
            let precision = {
                'cost': undefined,
                'price': pricePrecision,
                'amount': amountPrecision,
            };
            if (quoteId === 'fiat') {
                quoteId = 'eur';
                precision['price'] = 2;
            }
            let base = this.commonCurrencyCode (baseId).toUpperCase ();
            let quote = this.commonCurrencyCode (quoteId).toUpperCase ();
            let symbol = base + '/' + quote;
            let active = true;
            let limits = {
                'amount': {
                    'min': market['min_size'],
                    'max': market['max_size'],
                },
                'price': {
                    'min': market['min_price'],
                    'max': market['max_price'],
                },
                'cost': undefined,
            };
            let info = market;
            let entry = {
                'id': id,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'baseId': baseId,
                'quoteId': quoteId,
                'active': active,
                'precision': precision,
                'limits': limits,
                'info': info,
            };
            result.push (entry);
        }
        return result;
    }

    async fetchOrderBook (symbol = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrderBook requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        let response = await this.publicGetOrderbooks (this.extend (request, params));
        response = response[market['id']];
        let datetime = this.safeString (response, 'timestamp');
        let timestamp = this.parse8601 (datetime);
        let result = {
            'bids': response['bids'],
            'asks': response['asks'],
            'timestamp': timestamp,
            'datetime': datetime,
            'nonce': this.milliseconds (),
        };
        return result;
    }

    async fetchTicker (symbol = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchTicker requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        let response = await this.publicGetTicker (this.extend (request, params));
        return this.parseTicker (response, market);
    }

    async fetchTickers (symbol = undefined, params = {}) {
        let markets = await this.loadMarkets ();
        let response = await this.publicGetTickerAll (this.extend (params));
        return this.parseTickers (response, markets);
    }

    parseTickers (response, markets) {
        let result = [];
        let keys = Object.keys (response);
        for (let i = 0; i < keys.length; i++) {
            result.push (this.parseTicker (response[keys[i]], this.marketsById[keys[i]]));
        }
        return this.filterByArray (result, 'symbol');
    }

    parseTicker (response, market = undefined) {
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let info = response;
        let time = this.safeString (response, 'time');
        let datetime = undefined;
        if (time === undefined) {
            datetime = this.safeString (response, 'timestamp');
        } else {
            datetime = time;
        }
        let timestamp = this.parse8601 (datetime);
        let high = this.safeFloat (response, 'high');
        let low = this.safeFloat (response, 'low');
        let bid = undefined;
        let bidVolume = undefined;
        let ask = undefined;
        let askVolume = undefined;
        let vwap = undefined;
        let open = this.safeFloat (response, 'open');
        let close = this.safeFloat (response, 'close');
        let last = this.safeFloat (response, 'last');
        if (last === undefined) {
            last = close;
        }
        let previousClose = undefined;
        let change = undefined;
        let percentage = undefined;
        let average = undefined;
        let baseVolume = this.safeFloat (response, 'volume');
        let quoteVolume = undefined;
        let result = {
            'symbol': symbol,
            'info': info,
            'timestamp': timestamp,
            'datetime': datetime,
            'high': high,
            'low': low,
            'bid': bid,
            'bidVolume': bidVolume,
            'ask': ask,
            'askVolume': askVolume,
            'vwap': vwap,
            'open': open,
            'close': close,
            'last': last,
            'previousClose': previousClose,
            'change': change,
            'percentage': percentage,
            'average': average,
            'baseVolume': baseVolume,
            'quoteVolume': quoteVolume,
        };
        return result;
    }

    async fetchTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchTrades requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        let response = await this.publicGetTrades (this.extend (request, params));
        return this.parseTrades (response[market['id']], market);
    }

    parseTrade (trade, market = undefined) {
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let info = trade;
        let id = undefined;
        let datetime = this.safeString (trade, 'timestamp');
        let timestamp = this.parse8601 (datetime);
        let order = undefined;
        let type = undefined;
        let side = this.safeString (trade, 'side');
        let takerOrMaker = undefined;
        let price = this.safeFloat (trade, 'price');
        let amount = this.safeFloat (trade, 'size');
        let cost = parseFloat (this.amountToPrecision (symbol, price * amount));
        let fee = undefined;
        let result = {
            'info': info,
            'id': id,
            'timestamp': timestamp,
            'datetime': datetime,
            'symbol': symbol,
            'order': order,
            'type': type,
            'side': side,
            'takerOrMaker': takerOrMaker,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': fee,
        };
        return result;
    }

    async fetchOHLCV (symbol = undefined, timeframe = '1h', since = undefined, limit = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOHLCV requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let to = this.seconds ();
        let fromTime = since;
        if (fromTime === undefined) {
            fromTime = to - 2592000; // default to a month
        } else {
            fromTime /= 1000;
        }
        let request = {
            'from': fromTime,
            'to': to,
            'symbol': market['id'],
            'resolution': this.timeframes[timeframe],
        };
        let response = await this.publicGetChart (this.extend (request, params));
        return this.parseOHLCVs (response, market, timeframe, since, limit);
    }

    parseOHLCV (response, market = undefined, timeframe = '1h', since = undefined, limit = undefined) {
        let time = this.parse8601 (this.safeString (response, 'time'));
        let open = this.safeFloat (response, 'open');
        let high = this.safeFloat (response, 'high');
        let low = this.safeFloat (response, 'low');
        let close = this.safeFloat (response, 'close');
        let volume = this.safeFloat (response, 'volume');
        return [
            time,
            open,
            high,
            low,
            close,
            volume,
        ];
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privateGetUserBalance (params);
        let result = {
            'info': response,
            'free': undefined,
            'used': undefined,
            'total': undefined,
        };
        let free = {};
        let used = {};
        let total = {};
        let currencyId = Object.keys (this.currencies_by_id);
        for (let i = 0; i < currencyId.length; i++) {
            let currency = this.currencies_by_id[currencyId[i]]['code'];
            let responseCurr = currencyId[i];
            if (responseCurr === 'eur') {
                responseCurr = 'fiat';
            }
            free[currency] = response[responseCurr + '_available'];
            total[currency] = response[responseCurr + '_balance'];
            used[currency] = parseFloat (this.currencyToPrecision (currency, total[currency] - free[currency]));
            result[currency] = {
                'free': free[currency],
                'used': used[currency],
                'total': total[currency],
            };
        }
        result['free'] = free;
        result['used'] = used;
        result['total'] = total;
        return result;
    }

    async fetchOrder (id = undefined, symbol = undefined, params = {}) {
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrder requires an orderId argument');
        }
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrder requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let orderId = this.safeValue (params, 'orderId');
        let request = {
            'orderId': orderId,
        };
        if (orderId === undefined) {
            request['orderId'] = id;
        }
        let response = await this.privateGetUserOrdersOrderId (this.extend (request, params));
        if (symbol !== this.markets_by_id[response['symbol']]['symbol']) {
            throw new BadRequest (this.id + ' symbol argument does not match order symbol');
        }
        return this.parseOrder (response, market);
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchOrders requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        let response = await this.privateGetUserOrders (this.extend (request, params));
        return this.parseOrders (response, market);
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        return this.fetchOrders (symbol, since, limit, params);
    }

    parseOrder (order, market = undefined) {
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        let id = this.safeString (order, 'id');
        let datetime = this.safeString (order, 'created_at');
        let timestamp = this.parse8601 (datetime);
        let lastTradeTimestamp = undefined;
        let type = this.safeString (order, 'type');
        let side = this.safeString (order, 'side');
        let price = this.safeFloat (order, 'price');
        let amount = this.safeFloat (order, 'size');
        let filled = this.safeFloat (order, 'filled');
        let remaining = parseFloat (this.amountToPrecision (symbol, amount - filled));
        let cost = undefined;
        let status = 'open';
        if (type === 'market') {
            status = 'closed';
        } else {
            cost = parseFloat (this.priceToPrecision (symbol, filled * price));
        }
        let trades = undefined;
        let fee = undefined;
        let info = order;
        let result = {
            'id': id,
            'datetime': datetime,
            'timestamp': timestamp,
            'lastTradeTimestamp': lastTradeTimestamp,
            'status': status,
            'symbol': symbol,
            'type': type,
            'side': side,
            'price': price,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'cost': cost,
            'trades': trades,
            'fee': fee,
            'info': info,
        };
        return result;
    }

    async createOrder (symbol = undefined, type = undefined, side = undefined, amount = undefined, price = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder requires a symbol argument');
        }
        if (type === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder requires a type argument');
        }
        if (side === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder requires a side argument');
        }
        if (amount === undefined) {
            throw new ArgumentsRequired (this.id + ' createOrder requires an amount argument');
        }
        if (type === 'limit' && price === undefined) {
            throw new ArgumentsRequired (this.id + ' limit createOrder requires a price argument');
        }
        if (type === 'market' && price !== undefined) {
            throw new BadRequest (this.id + ' market createOrder does not require a price argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let order = {
            'symbol': market['id'],
            'side': side,
            'size': amount,
            'type': type,
            'price': price,
        };
        let response = await this.privatePostOrder (this.extend (order, params));
        response['created_at'] = this.iso8601 (this.milliseconds ());
        return this.parseOrder (response, market);
    }

    async createLimitBuyOrder (symbol = undefined, amount = undefined, price = undefined, params = {}) {
        return this.createOrder (symbol, 'limit', 'buy', amount, price, params);
    }

    async createLimitSellOrder (symbol = undefined, amount = undefined, price = undefined, params = {}) {
        return this.createOrder (symbol, 'limit', 'sell', amount, price, params);
    }

    async createMarketBuyOrder (symbol = undefined, amount = undefined, params = {}) {
        return this.createOrder (symbol, 'market', 'buy', amount, undefined, params);
    }

    async createMarketSellOrder (symbol = undefined, amount = undefined, params = {}) {
        return this.createOrder (symbol, 'market', 'sell', amount, undefined, params);
    }

    async cancelOrder (id = undefined, symbol = undefined, params = {}) {
        if (id === undefined) {
            throw new ArgumentsRequired (this.id + ' cancelOrder requires an id argument');
        }
        let request = {
            'orderId': id,
        };
        let response = await this.privateDeleteUserOrdersOrderId (this.extend (request, params));
        return this.parseOrder (response);
    }

    async fetchMyTrades (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchMyTrades requires a symbol argument');
        }
        await this.loadMarkets ();
        let market = this.market (symbol);
        let request = {
            'symbol': market['id'],
        };
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let response = await this.privateGetUserTrades (this.extend (request, params));
        return this.parseTrades (response['data'], market, since, limit);
    }

    async fetchDepositAddress (code = undefined, params = {}) {
        if (code === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchDepositAddress requires a code argument');
        }
        await this.loadMarkets ();
        this.currency (code);
        let response = await this.privateGetUser ();
        let info = this.safeValue (response, 'crypto_wallet');
        let currency = this.safeString (this.fullCurrencies, code);
        let address = this.safeString (info, currency);
        return {
            'currency': code,
            'address': address,
            'tag': undefined,
            'info': info[currency],
        };
    }

    async fetchDeposits (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        if (code !== undefined) {
            let currency = this.currency (code)['id'];
            if (currency === 'eur') {
                currency = 'fiat';
            }
            request['currency'] = currency;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let response = await this.privateGetUserDeposits (this.extend (request, params));
        return this.parseTransactions (response.data);
    }

    async fetchWithdrawals (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {};
        if (code !== undefined) {
            let currency = this.currency (code)['id'];
            if (currency === 'eur') {
                currency = 'fiat';
            }
            request['currency'] = currency;
        }
        if (limit !== undefined) {
            request['limit'] = limit;
        }
        let response = await this.privateGetUserWithdrawals (this.extend (request, params));
        return this.parseTransactions (response.data);
    }

    parseTransaction (transaction, currency = undefined) {
        let id = this.safeFloat (transaction, 'id');
        let txid = this.safeString (transaction, 'transaction_id');
        let datetime = this.safeString (transaction, 'created_at');
        let timestamp = this.parse8601 (datetime);
        let addressFrom = undefined;
        let address = undefined;
        let addressTo = undefined;
        let tagFrom = undefined;
        let tag = undefined;
        let tagTo = undefined;
        let type = this.safeString (transaction, 'type');
        let amount = this.safeFloat (transaction, 'amount');
        let currencyId = this.safeString (transaction, 'currency');
        if (currencyId === 'fiat') {
            currencyId = 'eur';
        }
        currency = this.currencies_by_id[currencyId]['code'];
        let message = 'pending';
        let status = transaction['status'];
        let dismissed = transaction['dismissed'];
        let rejected = transaction['rejected'];
        if (status) {
            message = 'ok';
        } else if (dismissed) {
            message = 'canceled';
        } else if (rejected) {
            message = 'failed';
        }
        let updated = undefined;
        let comment = this.safeString (transaction, 'description');
        let fee = {
            'currency': currency,
            'cost': this.safeFloat (transaction, 'fee'),
            'rate': undefined,
        };
        return {
            'info': transaction,
            'id': id,
            'txid': txid,
            'timestamp': timestamp,
            'datetime': datetime,
            'addressFrom': addressFrom,
            'address': address,
            'addressTo': addressTo,
            'tagFrom': tagFrom,
            'tag': tag,
            'tagTo': tagTo,
            'type': type,
            'amount': amount,
            'currency': currency,
            'status': message,
            'updated': updated,
            'comment': comment,
            'fee': fee,
        };
    }

    async withdraw (code = undefined, amount = undefined, address = undefined, tag = undefined, params = {}) {
        if (code === undefined) {
            throw new ArgumentsRequired (this.id + ' withdraw requires a code argument');
        }
        if (amount === undefined) {
            throw new ArgumentsRequired (this.id + ' withdraw requires an amount argument');
        }
        if (address === undefined) {
            throw new ArgumentsRequired (this.id + ' withdraw requires an address argument');
        }
        this.checkAddress (address);
        await this.loadMarkets ();
        let currency = this.currencies[code]['id'];
        let request = {
            'currency': currency,
            'amount': amount,
            'address': address,
        };
        let response = await this.privatePostUserRequestWithdrawal (this.extend (request, params));
        return {
            'info': response,
            'id': undefined,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'] + '/' + this.version;
        if (api === 'public') {
            const query = this.omit (params, this.extractParams (path));
            url += '/' + this.implodeParams (path, params);
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else if (api === 'private') {
            this.checkRequiredCredentials ();
            const query = this.omit (params, this.extractParams (path));
            url += '/' + this.implodeParams (path, params);
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
            let accessToken = 'Bearer ' + this.apiKey;
            headers = {
                'Content-Type': 'application/json',
                'Authorization': accessToken,
            };
            if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
                if (Object.keys (params).length) {
                    body = this.json (params);
                }
            }
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    handleErrors (code, reason, url, method, headers, body, response) {
        if (code >= 400 && code <= 503) {
            const exceptions = this.exceptions;
            const message = this.safeString (response, 'message');
            const keys = Object.keys (exceptions);
            if (keys.indexOf (message) !== -1) {
                const ExceptionClass = exceptions[message];
                throw new ExceptionClass (this.id + ' ' + message);
            }
            let status = code.toString ();
            if (keys.indexOf (status) !== -1) {
                const ExceptionClass = exceptions[status];
                throw new ExceptionClass (this.id + ' ' + message);
            }
        }
    }

    async websocketSubscribe (event, symbol, params = {}) {
        await this.websocketSubscribeAll ([{
            'event': event,
            'symbol': symbol,
            'params': params,
        }]);
    }

    async websocketSubscribeAll (eventSymbols) {
        let promise = await new Promise (async (resolve, reject) => {
            for (let eventSymbol of eventSymbols) {
                if (eventSymbol['event'] !== 'ob' && eventSymbol['event'] !== 'trade') {
                    reject (new ExchangeError (`Not valid event ${event} for exchange ${this.id}`));
                    return;
                }
            }
            await this.loadMarkets ();
            if (this.socket === undefined) {
                this.socket = await io('https://api.hollaex.com/realtime');
            }
            for (let eventSymbol of eventSymbols) {
                let event;
                if (eventSymbol.event === 'ob') {
                    event = 'orderbook'
                } else if (eventSymbol.event === 'trade') {
                    event = 'trades'
                }
                await this.subscriptions[event].push(eventSymbol.symbol);
                this.socket.on(event, async (data) => {
                    let exchangeSymbol = data['symbol'] ? data['symbol'] : await Object.keys(data).filter(key => key.includes('-'))[0];
                    if (this.subscriptions[event].includes(this.convertSymbol(exchangeSymbol))) {
                        if (event === 'orderbook') {
                            let ob = this.websocketParseOrderBook(data[exchangeSymbol]);
                            this.emit('ob', this.convertSymbol(exchangeSymbol), ob);
                        } else if (event === 'trades') {
                            let trade = this.websocketParseTrade(data[exchangeSymbol], this.market(this.convertSymbol(exchangeSymbol)));
                            this.emit('trade', this.convertSymbol(exchangeSymbol), trade);
                        }
                    }
                })
            }
            resolve();
        })
        return promise;
    }

    convertSymbol (symbol) {
        return symbol.replace('-', '/').toUpperCase();
    }

    websocketParseOrderBook (response) {
        let datetime = this.safeString (response, 'timestamp');
        let timestamp = this.parse8601 (datetime);
        let result = {
            'bids': response['bids'],
            'asks': response['asks'],
            'timestamp': timestamp,
            'datetime': datetime,
            'nonce': this.milliseconds (),
        };
        return result;
    }

    websocketParseTrade (trades, market = undefined) {
        let response = [];
        trades.forEach((trade) => {
            let symbol = undefined;
            if (market !== undefined) {
                symbol = market['symbol'];
            }
            let info = trade;
            let id = undefined;
            let datetime = this.safeString (trade, 'timestamp');
            let timestamp = this.parse8601 (datetime);
            let order = undefined;
            let type = undefined;
            let side = this.safeString (trade, 'side');
            let takerOrMaker = undefined;
            let price = this.safeFloat (trade, 'price');
            let amount = this.safeFloat (trade, 'size');
            let cost = parseFloat (this.amountToPrecision (symbol, price * amount));
            let fee = undefined;
            let result = {
                'info': info,
                'id': id,
                'timestamp': timestamp,
                'datetime': datetime,
                'symbol': symbol,
                'order': order,
                'type': type,
                'side': side,
                'takerOrMaker': takerOrMaker,
                'price': price,
                'amount': amount,
                'cost': cost,
                'fee': fee,
            };
            response.push(result);
        })
        if (response.length > 1) {
            return response;
        } else {
            return response[0]
        }
    }
};
