const yahooFinance = require('yahoo-finance');
const async	       = require('async');
const fs 		   = require('fs');
const csvStringify = require('csv-stringify');

async.parallel([
	function(callback) {
		yahooFinance.snapshot({
		  symbols: ['ABEV3.SA', 'BBAS3.SA'],
		  fields: ['s', 'd1', 'l1']  // ex: ['s', 'n', 'd1', 'l1', 'y', 'r']
		}, function (err, snapshot) {
		  if(err)
		  	callback(err);
		  else
		  	callback(null, snapshot);
		});	
	},

	function updateFromTD(callback) {
		callback(null, 0);
	}

	],

	// Parallel execution merged here	
	function(err, raw_data) {
		if(err) {
			console.log(err);
			return;
		}
		else {
			async.waterfall([
				function(callback) {
					createCSV(raw_data[0], function(err, csv) { // TODO CHANGE results[0]
						if(err)
							callback(err);
						else
							callback(null, csv);
					}
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
	fs.writeFile(path + file_name, data, (err) => {
		if (err) {
	  		callback(err);
	  		return;
	  	}
		else {
			console.log('It\'s saved!');
		}
	});
};