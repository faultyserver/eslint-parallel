const { fork } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { CLIEngine } = require("eslint/lib/cli-engine/cli-engine");
const {
  FileEnumerator,
  CascadingConfigArrayFactory,
} = require("eslint/lib/cli-engine/file-enumerator");

const { formatResults } = require("./formatter");

const cpuCount = os.cpus().length;

function listFilesToProcess(patterns, options) {
  return Array.from(
    new FileEnumerator({
      ...options,
      configArrayFactory: new CascadingConfigArrayFactory(options),
    }).iterateFiles(patterns),
    ({ filePath, ignored }) => ({ filename: filePath, ignored })
  );
}

function hasEslintCache(options) {
  const cacheLocation =
    options.cacheFile ||
    options.cacheLocation ||
    path.join(options.cwd || process.cwd(), ".eslintcache");
  try {
    fs.accessSync(path.resolve(cacheLocation), fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function eslintFork(options, files) {
  return new Promise((resolve, reject) => {
    const eslintChild = fork(path.resolve(__dirname, "linter"));
    eslintChild.on("message", (report) => {
      if (report.errorCount || report.warningCount) {
        console.log(formatResults(report.results));
      }
      resolve(report);
    });
    eslintChild.on("exit", (code) => {
      if (code !== 0) {
        reject("Linting failed");
      }
    });
    eslintChild.send({ options, files });
  });
}

class Linter {
  constructor(options) {
    this._options = options;
    this._engine = new CLIEngine(options);
  }

  run(files) {
    return new Promise((resolve) => {
      const report = this._engine.executeOnFiles(files);
      if (this._options.fix) {
        CLIEngine.outputFixes(report);
      }

      if (this._options.quiet) {
        report.results = CLIEngine.getErrorResults(report.results);
      }
      resolve(report);
    });
  }

  execute(patterns) {
    return new Promise((resolve, reject) => {
      const files = listFilesToProcess(patterns, this._options).map(
        (f) => f.filename
      );

      const hasCache = hasEslintCache(this._options);

      if (!hasCache && files.length > 50 && cpuCount >= 2) {
        // too many items, need to spawn process (if machine has multi-core)
        const totalCount = {
          errorCount: 0,
          warningCount: 0,
        };
        const chunckedPromises = [];
        const chunkSize = Math.ceil(files.length / cpuCount);
        for (let i = 0; i < files.length; i += chunkSize) {
          const chunkedPaths = files.slice(i, i + chunkSize);
          const chunckedPromise = eslintFork(this._options, chunkedPaths);
          chunckedPromise.then((report) => {
            totalCount.errorCount += report.errorCount;
            totalCount.warningCount += report.warningCount;
          });
          chunckedPromises.push(chunckedPromise);
        }
        Promise.all(chunckedPromises).then(() => {
          resolve(totalCount);
        });
      } else {
        this.run(files).then((report) => {
          if (report.errorCount || report.warningCount) {
            console.log(formatResults(report.results));
          }
          resolve(report);
        }, reject);
      }
    });
  }
}

process.on("message", ({ options, files }) => {
  // make sure to ignore message to other nested processes
  if (files) {
    new Linter(options).run(files).then(
      (report) => {
        process.send(report);
      },
      (err) => {
        console.log(err);
        process.exit(1);
      }
    );
  }
});

module.exports = Linter;
