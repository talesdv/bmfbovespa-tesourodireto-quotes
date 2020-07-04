const yahooFinance = require('yahoo-finance');
const async	       = require('async');
const fs 		   = require('fs');
const csvStringify = require('csv-stringify');
const http		   = require('https');
const cheerio 	   = require('cheerio');

const td_list	   = require('./td_list.json');
const stock_list   = require('./stock_list.json');

async.parallel([
	function updateYahooFinance(callback) {
		var quotes_array = [];

		async.forEachOf(stock_list, function(result, i, for_callback) {
			yahooFinance.quote({
				symbol: stock_list[i].symbol_in,
			  	modules: ['price']
				}, 

				function (err, quote) {
					if(err)
						for_callback(err);

					quotes_array.push({
						"name" 				 : mapSymbolIn2Out(quote.price.symbol, stock_list),
						"lastTradePriceOnly" : quote.price.regularMarketPrice, 
					});

					for_callback(null);
			});	
		}, function(err) {
			if(err) {
				console.log(err);
			}

			callback(err, quotes_array);
		});	
	},

	function updateFromTD(callback) {
		var api_url = 'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json';
		let body = '';

		process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0; // The API uses a cipher not supported by recent versions (^14) of nodejs
		http.get(api_url, (response) => {
			response.on('data', d => body += d);
			response.on('end', () => {
				const td_response = JSON.parse(body);

				let tdPrices = td_response.response.TrsrBdTradgList
					.map((element) => {
						let tdRaw = element.TrsrBd;

						return {
							name: mapSymbolIn2Out(tdRaw.nm, td_list),
							lastTradePriceOnly: tdRaw.untrInvstmtVal
						}
					})
					.filter((element) => element.name !== -1 && element.lastTradePriceOnly > 0);

				callback(null, tdPrices);
			});
		});
	}

	],

	// Parallel execution merged here	
	function(err, raw_data) {
		if(err) {
			console.log(err);
			return;
		}
		else {
			var prices_combined = raw_data[0].concat(raw_data[1]);
			console.log(prices_combined);

			async.waterfall([
				function(callback) {
					createCSV(prices_combined, function(err, csv) {
						if(err)
							callback(err);
						else
							callback(null, csv);
					});
				},

				function(csv, callback) {
					writeToFile(csv, '', 'prices.csv', function(err) {
						if(err)
							callback(err);
						else
							callback(null);
					});
				}

			], function(err, results) {
				if(err) 
					console.log(err);
				else {
					console.log("DONE!");
				}
			});
		}
	}
);

function mapSymbolIn2Out(symbol, list) {
	for(var i=0; i<list.length; i++) {
		if(list[i].symbol_in.indexOf(symbol) != -1)
			return list[i].symbol_out;
	}

	// Not found
	return -1;
}

function createCSV(data, callback) {
	csvStringify(data, { 
		'quoted' : true,
		'columns': [
			'name',
			'lastTradePriceOnly',
			'lastTradeDate'
		]}, function(err, csv) {
		if(err)
			callback(err);
		else
			callback(null, csv);
	});
};

function writeToFile(data, path, file_name, callback) {
	fs.writeFile(path + file_name, data, function(err) {
		if (err)
	  		callback(err);
		else
			callback(null);
	});
};