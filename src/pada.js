
var argv = require("yargs")
	.usage("Usage: $0 [-d 'd' | --debugChar 'd'] filename")
	.demand(1)
	.alias('d', 'debugChar')
	.argv;

var libpada = require("./libpada");
var fs = require('fs');


var source = fs.readFileSync(argv._[0], 'ascii');

libpada.executePada(source, process.stdin, process.stdout, argv.debugChar);

