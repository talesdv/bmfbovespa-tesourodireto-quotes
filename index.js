const yahooFinance = require('yahoo-finance');
const async	       = require('async');
const fs 		   = require('fs');
const csvStringify = require('csv-stringify');
const http		   = require('http');
const cheerio 	   = require('cheerio');

const td_list	   = require('./td_list.json');
const stock_list   = require('./stock_list.json');

async.parallel([
	function updateYahooFinance(callback) {
		var stock_symbols = [];
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
						// "lastTradeDate"		 : 
					});

					for_callback(null);
			});	
		}, function(err) {
			if(err)
				console.log(err);

			console.log(quotes_array);
			callback(err, quotes_array);
		});

		// yahooFinance.snapshot({
		//   	symbols: stock_symbols,
		//   	fields: ['s', 'n', 'p', 'a']  // ex: ['s', 'n', 'd1', 'l1', 'y', 'r']
		// }, function (err, snapshot) {
		//   	request

		//   	if(err)
		//   		callback(err);
		//   	else {
		//   		// Get name from stock list, convert timestamp to date and delete symbol
		// 		for(var i=0; i<snapshot.length; i++) {
		// 			snapshot[i].name = mapSymbolIn2Out(snapshot[i].symbol, stock_list);
		// 			delete snapshot[i].symbol;
		// 			snapshot[i].lastTradeDate = timestampToDateString(snapshot[i].lastTradeDate);
		// 		}

		//   		callback(null, snapshot);
		//   	}
		// });	
	},

	function updateFromTD(callback) {

		//var base_url = 'http://www3.tesouro.gov.br/tesouro_direto/consulta_titulos_novosite/consultatitulos.asp';
		var base_url = 'http://www.tesouro.fazenda.gov.br/tesouro-direto-precos-e-taxas-dos-titulos/';
		var body = '';
		var selector = '#p_p_id_precosetaxas_WAR_tesourodiretoportlet_ > div > div > div > div.sanfonado > table > tbody';
		
		http.get(base_url, function(response) {
			response.on('data', function(d) {
				body += d;
			});

			response.on('end', function() {
				var doc_cheerio = cheerio.load(body);
				
				var response_filtered = [];
				var price_string;
				var symbol_string;
				var name_string;
				var price_float;

				doc_cheerio(selector).children('.camposTesouroDireto').each(
					function(i, element) {
						symbol_string = element.children[1].children[0].data;

						price_string = element.children[7].children[0].data;

						// Remove 'R$' from price
						price_string = price_string.replace('R$', '');

						// // Remove point if it exists
						price_string = price_string.replace('.', '');

						// // Replace comma with point
						price_string = price_string.replace(',', '.');

						price_float = parseFloat(price_string);

						name_string = mapSymbolIn2Out(symbol_string, td_list);

						// If not found, don't need to push this object
						if(name_string != -1) {
							response_filtered.push({
								'name'				: name_string,
								'lastTradePriceOnly': price_float
								// 'lastTradeDate'		: '',
							});
						}
					}
				);

				callback(null, response_filtered);
			});
		});

		// var query = 'select * from html where (url = @url) and (xpath = @xpath)';
		// var base_url = 'http://www3.tesouro.gov.br/tesouro_direto/consulta_titulos_novosite/consultatitulos.asp';

		// // XPATH should be: //*[@id="p_p_id_precosetaxas_WAR_tesourodiretoportlet_"]/div/div/div/table[2]/tbody
		// var xpath = '/html/body/table/tbody/tr/td[1]/table/tbody/tr/td[2]/center/table/tbody'

		// var query_yql = new yql(query)
		// 	.setParam('url', base_url)
		// 	.setParam('xpath', xpath);

		// query_yql.exec(function(err, response) {
		// 	if(err) {
		// 		callback(err);
		// 		return;
		// 	}

		// 	var table = response.query.results.tbody.tr;
		// 	var response_filtered = [];

		// 	const filterElementClass  = 'listing0';
		// 	const indexPricePrimary	  = 4;
		// 	const indexPriceSecondary = 5;
		// 	const indexName			  = 0;

		// 	var td_line;
		// 	var price_string;
		// 	var symbol_string;
		// 	var name_string;
		// 	var price_float;
			
		// 	for(var i=0; i<table.length; i++) {
		// 		td_line = table[i];

		// 		if(td_line.td && Array.isArray(td_line.td) && td_line.td[0].class.indexOf(filterElementClass) != -1) {
		// 			if(td_line.td[indexPricePrimary].content != null)
		// 				price_string = td_line.td[indexPricePrimary].content;
		// 			else
		// 				price_string = td_line.td[indexPriceSecondary].content;

		// 			// Remove 'R$' from price
		// 			price_string = price_string.replace('R$', '');

		// 			// // Remove point if it exists
		// 			price_string = price_string.replace('.', '');

		// 			// // Replace comma with point
		// 			price_string = price_string.replace(',', '.');

		// 			price_float = parseFloat(price_string);

		// 			symbol_string = td_line.td[indexName].content;

		// 			name_string = mapSymbolIn2Out(symbol_string, td_list);

		// 			// If not found, don't need to push this object
		// 			if(name_string != -1) {
		// 				response_filtered.push({
		// 					'name'				: name_string,
		// 					'lastTradeDate'		: '',
		// 					'lastTradePriceOnly': price_float
		// 				});
		// 			}
		// 		}
		// 	}

			// callback(null, null);
		// });
	}

	],

	// Parallel execution merged here	
	function(err, raw_data) {
		console.log(raw_data);
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