'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError, ArgumentsRequired, NullResponse, InvalidOrder, NotSupported, AuthenticationError, NetworkError } = require ('./base/errors');

//  ---------------------------------------------------------------------------

module.exports = class cex extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'cex',
            'name': 'CEX.IO',
            'countries': [ 'GB', 'EU', 'CY', 'RU' ],
            'rateLimit': 1500,
            'has': {
                'CORS': true,
                'fetchTickers': true,
                'fetchOHLCV': true,
                'fetchOrder': true,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'fetchDepositAddress': true,
            },
            'timeframes': {
                '1m': '1m',
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/27766442-8ddc33b0-5ed8-11e7-8b98-f786aef0f3c9.jpg',
                'api': 'https://cex.io/api',
                'www': 'https://cex.io',
                'doc': 'https://cex.io/cex-api',
                'fees': [
                    'https://cex.io/fee-schedule',
                    'https://cex.io/limits-commissions',
                ],
                'referral': 'https://cex.io/r/0/up105393824/0/',
            },
            'requiredCredentials': {
                'apiKey': true,
                'secret': true,
                'uid': true,
            },
            'api': {
                'public': {
                    'get': [
                        'currency_limits/',
                        'last_price/{pair}/',
                        'last_prices/{currencies}/',
                        'ohlcv/hd/{yyyymmdd}/{pair}',
                        'order_book/{pair}/',
                        'ticker/{pair}/',
                        'tickers/{currencies}/',
                        'trade_history/{pair}/',
                    ],
                    'post': [
                        'convert/{pair}',
                        'price_stats/{pair}',
                    ],
                },
                'private': {
                    'post': [
                        'active_orders_status/',
                        'archived_orders/{pair}/',
                        'balance/',
                        'cancel_order/',
                        'cancel_orders/{pair}/',
                        'cancel_replace_order/{pair}/',
                        'close_position/{pair}/',
                        'get_address/',
                        'get_myfee/',
                        'get_order/',
                        'get_order_tx/',
                        'open_orders/{pair}/',
                        'open_orders/',
                        'open_position/{pair}/',
                        'open_positions/{pair}/',
                        'place_order/{pair}/',
                    ],
                },
            },
            'wsconf': {
                'conx-tpls': {
                    'default': {
                        'type': 'ws',
                        'baseurl': 'wss://ws.cex.io/ws/',
                        'wait4readyEvent': 'auth',
                    },
                },
                'methodmap': {
                    'connected': '_websocketHandleConnected',
                    'auth': '_websocketHandleAuth',
                    'ping': '_websocketHandlePing',
                    'order-book-subscribe': '_websocketHandleObSubscribe',
                    'order-book-unsubscribe': '_websocketHandleObUnsubscribe',
                    'md_update': '_websocketHandleObUpdate',
                },
                'events': {
                    'ob': {
                        'conx-tpl': 'default',
                        'conx-param': {
                            'url': '{baseurl}',
                            'id': '{id}',
                        },
                    },
                    'tickers': {
                    },
                    'ohlvc': {
                    },
                    'trades': {
                    },
                },
            },
            'fees': {
                'trading': {
                    'maker': 0.16 / 100,
                    'taker': 0.25 / 100,
                },
                'funding': {
                    'withdraw': {
                        // 'USD': undefined,
                        // 'EUR': undefined,
                        // 'RUB': undefined,
                        // 'GBP': undefined,
                        'BTC': 0.001,
                        'ETH': 0.01,
                        'BCH': 0.001,
                        'DASH': 0.01,
                        'BTG': 0.001,
                        'ZEC': 0.001,
                        'XRP': 0.02,
                    },
                    'deposit': {
                        // 'USD': amount => amount * 0.035 + 0.25,
                        // 'EUR': amount => amount * 0.035 + 0.24,
                        // 'RUB': amount => amount * 0.05 + 15.57,
                        // 'GBP': amount => amount * 0.035 + 0.2,
                        'BTC': 0.0,
                        'ETH': 0.0,
                        'BCH': 0.0,
                        'DASH': 0.0,
                        'BTG': 0.0,
                        'ZEC': 0.0,
                        'XRP': 0.0,
                        'XLM': 0.0,
                    },
                },
            },
            'options': {
                'fetchOHLCVWarning': true,
                'createMarketBuyOrderRequiresPrice': true,
            },
        });
    }

    async fetchMarkets (params = {}) {
        let markets = await this.publicGetCurrencyLimits ();
        let result = [];
        for (let p = 0; p < markets['data']['pairs'].length; p++) {
            let market = markets['data']['pairs'][p];
            let id = market['symbol1'] + '/' + market['symbol2'];
            let symbol = id;
            let [ base, quote ] = symbol.split ('/');
            result.push ({
                'id': id,
                'info': market,
                'symbol': symbol,
                'base': base,
                'quote': quote,
                'precision': {
                    'price': this.precisionFromString (this.safeString (market, 'minPrice')),
                    'amount': this.precisionFromString (this.safeString (market, 'minLotSize')),
                },
                'limits': {
                    'amount': {
                        'min': market['minLotSize'],
                        'max': market['maxLotSize'],
                    },
                    'price': {
                        'min': this.safeFloat (market, 'minPrice'),
                        'max': this.safeFloat (market, 'maxPrice'),
                    },
                    'cost': {
                        'min': market['minLotSizeS2'],
                        'max': undefined,
                    },
                },
            });
        }
        return result;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        let response = await this.privatePostBalance ();
        let result = { 'info': response };
        let ommited = [ 'username', 'timestamp' ];
        let balances = this.omit (response, ommited);
        let currencies = Object.keys (balances);
        for (let i = 0; i < currencies.length; i++) {
            let currency = currencies[i];
            if (currency in balances) {
                let account = {
                    'free': this.safeFloat (balances[currency], 'available', 0.0),
                    'used': this.safeFloat (balances[currency], 'orders', 0.0),
                    'total': 0.0,
                };
                account['total'] = this.sum (account['free'], account['used']);
                result[currency] = account;
            }
        }
        return this.parseBalance (result);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let request = {
            'pair': this.marketId (symbol),
        };
        if (limit !== undefined) {
            request['depth'] = limit;
        }
        let orderbook = await this.publicGetOrderBookPair (this.extend (request, params));
        let timestamp = orderbook['timestamp'] * 1000;
        return this.parseOrderBook (orderbook, timestamp);
    }

    parseOHLCV (ohlcv, market = undefined, timeframe = '1m', since = undefined, limit = undefined) {
        return [
            ohlcv[0] * 1000,
            ohlcv[1],
            ohlcv[2],
            ohlcv[3],
            ohlcv[4],
            ohlcv[5],
        ];
    }

    async fetchOHLCV (symbol, timeframe = '1m', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        if (since === undefined) {
            since = this.milliseconds () - 86400000; // yesterday
        } else {
            if (this.options['fetchOHLCVWarning']) {
                throw new ExchangeError (this.id + " fetchOHLCV warning: CEX can return historical candles for a certain date only, this might produce an empty or null reply. Set exchange.options['fetchOHLCVWarning'] = false or add ({ 'options': { 'fetchOHLCVWarning': false }}) to constructor params to suppress this warning message.");
            }
        }
        let ymd = this.ymd (since);
        ymd = ymd.split ('-');
        ymd = ymd.join ('');
        let request = {
            'pair': market['id'],
            'yyyymmdd': ymd,
        };
        try {
            let response = await this.publicGetOhlcvHdYyyymmddPair (this.extend (request, params));
            let key = 'data' + this.timeframes[timeframe];
            let ohlcvs = JSON.parse (response[key]);
            return this.parseOHLCVs (ohlcvs, market, timeframe, since, limit);
        } catch (e) {
            if (e instanceof NullResponse) {
                return [];
            }
        }
    }

    parseTicker (ticker, market = undefined) {
        let timestamp = undefined;
        if ('timestamp' in ticker) {
            timestamp = parseInt (ticker['timestamp']) * 1000;
        }
        let volume = this.safeFloat (ticker, 'volume');
        let high = this.safeFloat (ticker, 'high');
        let low = this.safeFloat (ticker, 'low');
        let bid = this.safeFloat (ticker, 'bid');
        let ask = this.safeFloat (ticker, 'ask');
        let last = this.safeFloat (ticker, 'last');
        let symbol = undefined;
        if (market)
            symbol = market['symbol'];
        return {
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': high,
            'low': low,
            'bid': bid,
            'bidVolume': undefined,
            'ask': ask,
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': volume,
            'quoteVolume': undefined,
            'info': ticker,
        };
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        let currencies = Object.keys (this.currencies);
        let response = await this.publicGetTickersCurrencies (this.extend ({
            'currencies': currencies.join ('/'),
        }, params));
        let tickers = response['data'];
        let result = {};
        for (let t = 0; t < tickers.length; t++) {
            let ticker = tickers[t];
            let symbol = ticker['pair'].replace (':', '/');
            let market = this.markets[symbol];
            result[symbol] = this.parseTicker (ticker, market);
        }
        return result;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let ticker = await this.publicGetTickerPair (this.extend ({
            'pair': market['id'],
        }, params));
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        let timestamp = parseInt (trade['date']) * 1000;
        return {
            'info': trade,
            'id': trade['tid'],
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': market['symbol'],
            'type': undefined,
            'side': trade['type'],
            'price': this.safeFloat (trade, 'price'),
            'amount': this.safeFloat (trade, 'amount'),
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let market = this.market (symbol);
        let response = await this.publicGetTradeHistoryPair (this.extend ({
            'pair': market['id'],
        }, params));
        return this.parseTrades (response, market, since, limit);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        if (type === 'market') {
            // for market buy it requires the amount of quote currency to spend
            if (side === 'buy') {
                if (this.options['createMarketBuyOrderRequiresPrice']) {
                    if (price === undefined) {
                        throw new InvalidOrder (this.id + " createOrder() requires the price argument with market buy orders to calculate total order cost (amount to spend), where cost = amount * price. Supply a price argument to createOrder() call if you want the cost to be calculated for you from price and amount, or, alternatively, add .options['createMarketBuyOrderRequiresPrice'] = false to supply the cost in the amount argument (the exchange-specific behaviour)");
                    } else {
                        amount = amount * price;
                    }
                }
            }
        }
        await this.loadMarkets ();
        let request = {
            'pair': this.marketId (symbol),
            'type': side,
            'amount': amount,
        };
        if (type === 'limit') {
            request['price'] = price;
        } else {
            request['order_type'] = type;
        }
        let response = await this.privatePostPlaceOrderPair (this.extend (request, params));
        return {
            'info': response,
            'id': response['id'],
        };
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        return await this.privatePostCancelOrder ({ 'id': id });
    }

    parseOrderStatus (status) {
        const statuses = {
            'a': 'open',
            'cd': 'canceled',
            'c': 'canceled',
            'd': 'closed',
        };
        return this.safeValue (statuses, status, status);
    }

    parseOrder (order, market = undefined) {
        // Depending on the call, 'time' can be a unix int, unix string or ISO string
        // Yes, really
        let timestamp = this.safeValue (order, 'time');
        if (typeof timestamp === 'string' && timestamp.indexOf ('T') >= 0) {
            // ISO8601 string
            timestamp = this.parse8601 (timestamp);
        } else {
            // either integer or string integer
            timestamp = parseInt (timestamp);
        }
        let symbol = undefined;
        if (market === undefined) {
            let symbol = order['symbol1'] + '/' + order['symbol2'];
            if (symbol in this.markets)
                market = this.market (symbol);
        }
        let status = order['status'];
        if (status === 'a') {
            status = 'open'; // the unified status
        } else if (status === 'cd') {
            status = 'canceled';
        } else if (status === 'c') {
            status = 'canceled';
        } else if (status === 'd') {
            status = 'closed';
        }
        let price = this.safeFloat (order, 'price');
        let amount = this.safeFloat (order, 'amount');
        let remaining = this.safeFloat (order, 'pending');
        if (!remaining)
            remaining = this.safeFloat (order, 'remains');
        let filled = amount - remaining;
        let fee = undefined;
        let cost = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
            cost = this.safeFloat (order, 'ta:' + market['quote']);
            if (cost === undefined)
                cost = this.safeFloat (order, 'tta:' + market['quote']);
            let baseFee = 'fa:' + market['base'];
            let baseTakerFee = 'tfa:' + market['base'];
            let quoteFee = 'fa:' + market['quote'];
            let quoteTakerFee = 'tfa:' + market['quote'];
            let feeRate = this.safeFloat (order, 'tradingFeeMaker');
            if (!feeRate)
                feeRate = this.safeFloat (order, 'tradingFeeTaker', feeRate);
            if (feeRate)
                feeRate /= 100.0; // convert to mathematically-correct percentage coefficients: 1.0 = 100%
            if ((baseFee in order) || (baseTakerFee in order)) {
                let baseFeeCost = this.safeFloat (order, baseFee);
                if (baseFeeCost === undefined)
                    baseFeeCost = this.safeFloat (order, baseTakerFee);
                fee = {
                    'currency': market['base'],
                    'rate': feeRate,
                    'cost': baseFeeCost,
                };
            } else if ((quoteFee in order) || (quoteTakerFee in order)) {
                let quoteFeeCost = this.safeFloat (order, quoteFee);
                if (quoteFeeCost === undefined)
                    quoteFeeCost = this.safeFloat (order, quoteTakerFee);
                fee = {
                    'currency': market['quote'],
                    'rate': feeRate,
                    'cost': quoteFeeCost,
                };
            }
        }
        if (!cost)
            cost = price * filled;
        return {
            'id': order['id'],
            'datetime': this.iso8601 (timestamp),
            'timestamp': timestamp,
            'lastTradeTimestamp': undefined,
            'status': status,
            'symbol': symbol,
            'type': undefined,
            'side': order['type'],
            'price': price,
            'cost': cost,
            'amount': amount,
            'filled': filled,
            'remaining': remaining,
            'trades': undefined,
            'fee': fee,
            'info': order,
        };
    }

    async fetchOpenOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {};
        let method = 'privatePostOpenOrders';
        let market = undefined;
        if (symbol !== undefined) {
            market = this.market (symbol);
            request['pair'] = market['id'];
            method += 'Pair';
        }
        const orders = await this[method] (this.extend (request, params));
        for (let i = 0; i < orders.length; i++) {
            orders[i] = this.extend (orders[i], { 'status': 'open' });
        }
        return this.parseOrders (orders, market, since, limit);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        let method = 'privatePostArchivedOrdersPair';
        if (symbol === undefined) {
            throw new ArgumentsRequired (this.id + ' fetchClosedOrders requires a symbol argument');
        }
        const market = this.market (symbol);
        const request = { 'pair': market['id'] };
        const response = await this[method] (this.extend (request, params));
        return this.parseOrders (response, market, since, limit);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            'id': id.toString (),
        };
        const response = await this.privatePostGetOrder (this.extend (request, params));
        return this.parseOrder (response);
    }

    nonce () {
        return this.milliseconds ();
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = this.urls['api'] + '/' + this.implodeParams (path, params);
        let query = this.omit (params, this.extractParams (path));
        if (api === 'public') {
            if (Object.keys (query).length)
                url += '?' + this.urlencode (query);
        } else {
            this.checkRequiredCredentials ();
            let nonce = this.nonce ().toString ();
            let auth = nonce + this.uid + this.apiKey;
            let signature = this.hmac (this.encode (auth), this.encode (this.secret));
            body = this.urlencode (this.extend ({
                'key': this.apiKey,
                'signature': signature.toUpperCase (),
                'nonce': nonce,
            }, query));
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    async request (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let response = await this.fetch2 (path, api, method, params, headers, body);
        if (!response) {
            throw new NullResponse (this.id + ' returned ' + this.json (response));
        } else if (response === true || response === 'true') {
            return response;
        } else if ('e' in response) {
            if ('ok' in response)
                if (response['ok'] === 'ok')
                    return response;
            throw new ExchangeError (this.id + ' ' + this.json (response));
        } else if ('error' in response) {
            if (response['error'])
                throw new ExchangeError (this.id + ' ' + this.json (response));
        }
        return response;
    }

    async fetchDepositAddress (code, params = {}) {
        if (code === 'XRP' || code === 'XLM') {
            // https://github.com/ccxt/ccxt/pull/2327#issuecomment-375204856
            throw new NotSupported (this.id + ' fetchDepositAddress does not support XRP and XLM addresses yet (awaiting docs from CEX.io)');
        }
        await this.loadMarkets ();
        let currency = this.currency (code);
        let request = {
            'currency': currency['id'],
        };
        let response = await this.privatePostGetAddress (this.extend (request, params));
        let address = this.safeString (response, 'data');
        this.checkAddress (address);
        return {
            'currency': code,
            'address': address,
            'tag': undefined,
            'info': response,
        };
    }

    _websocketOnMessage (contextId, data) {
        let msg = JSON.parse (data);
        let e = this.safeString (msg, 'e');
        let oid = this.safeString (msg, 'oid');
        let resData = this.safeValue (msg, 'data', {});
        if (e in this.wsconf['methodmap']) {
            let method = this.wsconf['methodmap'][e];
            this[method] (contextId, msg, oid, resData);
        }
    }

    _websocketHandleConnected (contextId, msg, oid, data) { // eslint-disable-line no-unused-vars
        this.websocketSendJson (this._websocketAuthPayload ());
    }

    _websocketHandleAuth (contextId, msg, oid, resData) {
        this._contextSetConnectionAuth (contextId, true);
        if (msg['ok'] === 'ok') {
            this.emit ('auth', true);
        } else {
            this.emit ('auth', false, new AuthenticationError (this.safeString (resData, 'error', 'auth error')));
        }
    }

    _websocketHandlePing (contextId, msg, oid, data) { // eslint-disable-line no-unused-vars
        this.websocketSendJson ({ 'e': 'pong' });
    }

    _websocketHandleObSubscribe (contextId, msg, oid, resData) {
        if (msg['ok'] === 'ok') {
            let symbol = resData['pair'].replace (':', '/');
            let timestamp = resData['timestamp'] * 1000;
            let ob = this.parseOrderBook (resData, timestamp);
            ob['nonce'] = resData['id'];
            let data = this._contextGetSymbolData (contextId, 'ob', symbol);
            data['ob'] = ob;
            this._contextSetSymbolData (contextId, 'ob', symbol, data);
            this.emit (oid, true);
            this.emit ('ob', symbol, this._cloneOrderBook (data['ob'], data['limit']));
        } else {
            let error = new ExchangeError (this.safeString (resData, 'error', 'orderbook error'));
            this.emit (oid, false, error);
        }
    }

    _websocketHandleObUnsubscribe (contextId, msg, oid, resData) {
        if (msg['ok'] === 'ok') {
            let data = this.safeValue (msg, 'data');
            if (typeof data !== 'undefined') {
                let pair = this.safeValue (data, 'pair');
                if (typeof pair !== 'undefined') {
                    // let symbol = resData['pair'].replace (':', '/');
                    this.emit (oid, true);
                }
            }
        } else {
            let error = new ExchangeError (this.safeString (resData, 'error', 'orderbook error'));
            this.emit (oid, false, error);
        }
    }

    _websocketHandleObUpdate (contextId, msg, oid, resData) {
        let symbol = resData['pair'].replace (':', '/');
        let timestamp = resData['time'];
        let data = this._contextGetSymbolData (contextId, 'ob', symbol);
        if (data['ob']['nonce'] !== (resData['id'] - 1)) {
            this.websocketClose ();
            this.emit ('err', new NetworkError ('invalid orderbook sequence in ' + this.id + ' ' + data['ob']['nonce'] + ' !== ' + resData['id'] + ' -1'));
        } else {
            let ob = this.mergeOrderBookDelta (data['ob'], resData, timestamp);
            ob['nonce'] = resData['id'];
            data['ob'] = ob;
            this._contextSetSymbolData (contextId, 'ob', symbol, data);
            this.emit ('ob', symbol, this._cloneOrderBook (data['ob'], data['limit']));
        }
    }

    _websocketAuthPayload () {
        let timestamp = Math.floor (this.milliseconds () / 1000);
        timestamp = timestamp.toString ();
        return {
            'e': 'auth',
            'auth': {
                'key': this.apiKey,
                'signature': this.hmac (this.encode (timestamp + this.apiKey), this.encode (this.secret)),
                'timestamp': timestamp,
            },
        };
    }

    _websocketSubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob') {
            throw new NotSupported ('subscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let [currencyBase, currencyQuote] = symbol.split ('/');
        let data = this._contextGetSymbolData (contextId, event, symbol);
        data['limit'] = this.safeValue (params, 'limit');
        this._contextSetSymbolData (contextId, event, symbol, data);
        this.websocketSendJson ({
            'e': 'order-book-subscribe',
            'data': {
                'pair': [currencyBase, currencyQuote],
                'subscribe': true,
                'depth': 0,
            },
            'oid': nonce,
        });
    }

    _websocketUnsubscribe (contextId, event, symbol, nonce, params = {}) {
        if (event !== 'ob') {
            throw new NotSupported ('unsubscribe ' + event + '(' + symbol + ') not supported for exchange ' + this.id);
        }
        let [currencyBase, currencyQuote] = symbol.split ('/');
        this.websocketSendJson ({
            'e': 'order-book-unsubscribe',
            'data': {
                'pair': [currencyBase, currencyQuote],
            },
            'oid': nonce,
        });
    }

    _getCurrentWebsocketOrderbook (contextId, symbol, limit) {
        let data = this._contextGetSymbolData (contextId, 'ob', symbol);
        if (('ob' in data) && (typeof data['ob'] !== 'undefined')) {
            return this._cloneOrderBook (data['ob'], limit);
        }
        return undefined;
    }
};
