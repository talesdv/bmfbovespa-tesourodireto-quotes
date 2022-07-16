import {fetchAndRecord} from "./lib"
import { load } from "./lib/quoteConfiguration";
import { normalize } from "path";

// TODO: config file path as argument
const CONFIG_FILE_PATH = normalize(`${__dirname}/../quoteConfig.json`);

// TODO: tests
// TODO: readme
// TODO: lint

/**
 * Required to await for all promises. 
 * A dummy `setInterval` is instantiated to prevent the process to end.
 * https://github.com/nodejs/node/issues/22088
 */
async function wrapDataFetch() {  
  process.exitCode = 1;
  const interval = setInterval(() => {}, 60 * 1000);

  try {
    const config = await load(CONFIG_FILE_PATH);
    await fetchAndRecord(config);
  } finally {
    clearInterval(interval);
    process.exitCode = 0;
  }
}

wrapDataFetch();