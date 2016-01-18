const yahooFinance = require('yahoo-finance');
const async	       = require('async');
const fs 		   = require('fs');
const csvStringify = require('csv-stringify');
const yql 		   = require('yql');

const td_list	   = require('./td_list.json');
const stock_list   = require('./stock_list.json');

async.parallel([
	function updateYahooFinance(callback) {
		var stock_symbols = [];

		// Create stock symbol list from stock file
		for(var i=0; i<stock_list.length; i++)
			stock_symbols.push(stock_list[i].symbol_in);

		yahooFinance.snapshot({
		  	symbols: stock_symbols,
		  	fields: ['s', 'n', 'd1', 'l1']  // ex: ['s', 'n', 'd1', 'l1', 'y', 'r']
		}, function (err, snapshot) {
		  	if(err)
		  		callback(err);
		  	else {
		  		// Get name from stock list, convert timestamp to date and delete symbol
				for(var i=0; i<snapshot.length; i++) {
					snapshot[i].name = mapSymbolIn2Out(snapshot[i].symbol, stock_list);
					delete snapshot[i].symbol;
					snapshot[i].lastTradeDate = timestampToDateString(snapshot[i].lastTradeDate);
				}

		  		callback(null, snapshot);
		  	}
		});	
	},

	function updateFromTD(callback) {
		var query = 'select * from html where (url = @url) and (xpath = @xpath)';
		var base_url = 'http://www.tesouro.fazenda.gov.br/tesouro-direto-precos-e-taxas-dos-titulos';

		// XPATH should be: //*[@id="p_p_id_precosetaxas_WAR_tesourodiretoportlet_"]/div/div/div/table[2]/tbody
		var xpath = '//*[@id=\"p_p_id_precosetaxas_WAR_tesourodiretoportlet_\"]/div/div/div/table[2]/tbody'

		var query_yql = new yql(query)
			.setParam('url', base_url)
			.setParam('xpath', xpath);

		query_yql.exec(function(err, response) {
			if(err) {
				callback(err);
				return;
			}

			var table = response.query.results.tbody.tr;
			var response_filtered = [];

			const filterElementClass  = 'camposTesouroDireto';
			const indexPricePrimary	  = 4;
			const indexPriceSecondary = 5;
			const indexName			  = 0;

			var td_line;
			var price_string;
			var symbol_string;
			var name_string;
			var price_float;

			for(var i=0; i<table.length; i++) {
				if(table[i].class == filterElementClass) {
					td_line = table[i];

					if(td_line.td[indexPricePrimary].content.indexOf('R$0,00') == -1)
						price_string = td_line.td[indexPricePrimary].content;
					else
						price_string = td_line.td[indexPriceSecondary].content;

					// Remove 'R$' from price
					price_string = price_string.replace('R$', '');

					// // Remove point if it exists
					price_string = price_string.replace('.', '');

					// // Replace comma with point
					price_string = price_string.replace(',', '.');

					price_float = parseFloat(price_string);

					symbol_string = td_line.td[indexName].content;

					name_string = mapSymbolIn2Out(symbol_string, td_list);

					// If not found, don't need to push this object
					if(name_string != -1) {
						response_filtered.push({
							'name'				: name_string,
							'lastTradeDate'		: '',
							'lastTradePriceOnly': price_float
						});
					}
				}
			}

			callback(null, response_filtered);
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
					writeToFile(csv, 'D:\\', 'test.csv', function(err) {
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

function timestampToDateString(timestamp) {
	var date = new Date(timestamp);

	var date_string = '';
	date_string = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();

	return date_string;
};

function writeToFile(data, path, file_name, callback) {
	fs.writeFile(path + file_name, data, function(err) {
		if (err)
	  		callback(err);
		else
			callback(null);
	});
};