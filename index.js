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
			stock_symbols.push(stock_list[i].symbol);

		yahooFinance.snapshot({
		  	symbols: stock_symbols,
		  	fields: ['s', 'd1', 'l1']  // ex: ['s', 'n', 'd1', 'l1', 'y', 'r']
		}, function (err, snapshot) {
		  	if(err)
		  		callback(err);
		  	else {
		  		// Remove '.SA' from symbols
				for(var i=0; i<snapshot.length; i++) {
					snapshot[i].symbol = snapshot[i].symbol.replace('.SA', '');
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
			var name_string;
			var price_float;

			for(var i=0; i<table.length; i++) {
				if(table[i].class == filterElementClass) {
					td_line = table[i];

					if(td_line.td[indexPricePrimary].content != 'R$0,00')
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

					name_string = td_line.td[indexName].content;

					response_filtered.push({
						'symbol'		: name_string,
						'lastTradeDate'	: '',
						'lastTradePriceOnly': price_float
					});
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



function refactorCSV() {
	// Convert timestamp
	// Remove .SA
};

function createCSV(data, callback) {
	console.log(data);
	csvStringify(data, function(err, csv) {
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