#!/usr/bin/env node

import {Command, Option} from 'commander';
import {meter} from "./meter";

const program = new Command();

program
  .arguments('<url>')
  .option('-h2, --http2', 'allow http/2', false)
  .addOption(new Option('-c, --compression <algo>', 'compression used').choices(['gzip', 'brotli', 'none']).default('gzip'))
  .option('-v, --verbose', 'prints extra information')
  .option('-h, --host', 'overrides host info')
  .action((url, options) => {
    meter(
      url, {
        http2: options.http2,
        verbose: options.verbose,
        compression: options.compression
      }
    ).then((data) => console.log(JSON.stringify(data, undefined, 2)))
      .then(() => process.exit(0))
  });

program.addHelpText('after', `

Example call:
  $ flow-meter https://facebook.com -c brotli --http2`);

program.parse();