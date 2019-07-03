<?php

namespace ccxt;

// PLEASE DO NOT EDIT THIS FILE, IT IS GENERATED AND WILL BE OVERWRITTEN:
// https://github.com/ccxt/ccxt/blob/master/CONTRIBUTING.md#how-to-contribute-code

use Exception as Exception; // a common import

class huobicny extends huobipro {

    public function describe () {
        return array_replace_recursive (parent::describe (), array (
            'id' => 'huobicny',
            'name' => 'Huobi CNY',
            'hostname' => 'be.huobi.com',
            'has' => array (
                'CORS' => false,
            ),
            'urls' => array (
                'logo' => 'https://user-images.githubusercontent.com/1294454/27766569-15aa7b9a-5edd-11e7-9e7f-44791f4ee49c.jpg',
                'api' => array (
                    'public' => 'https://be.huobi.com',
                    'private' => 'https://be.huobi.com',
                    'market' => 'https://be.huobi.com',
                ),
                'www' => 'https://www.huobi.com',
                'doc' => 'https://github.com/huobiapi/API_Docs/wiki/REST_api_reference',
            ),
        ));
    }
}
