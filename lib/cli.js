const optionator = require("eslint/lib/options");

const Linter = require("./linter");
const { formatTotal } = require("./formatter");

const KNOWN_OPTIONS = {
  envs: "envs",
  extensions: "ext",
  rules: "rule",
  plugins: "plugin",
  globals: "global",
  ignore: "ignore",
  ignorePath: "ignorePath",
  ignorePattern: "ignorePattern",
  configFile: "config",
  rulePaths: "rulesdir",
  useEslintrc: "eslintrc",
  parser: "parser",
  parserOptions: "parserOptions",
  cache: "cache",
  cacheFile: "cacheFile",
  cacheLocation: "cacheLocation",
  fix: "fix",
  allowInlineConfig: "inlineConfig",
};

function translateOptions(cliOptions) {
  const options = {};
  for (const [key, cliKey] of Object.entries(KNOWN_OPTIONS)) {
    if (cliKey in cliOptions) {
      options[key] = cliOptions[cliKey];
    }
  }
  return options;
}

// Force using flat config
const options = optionator();
const cliOptions = options.parse(process.argv);

if (cliOptions.version) {
  console.log(`v${require("../package.json").version}`);
} else if (cliOptions.help) {
  console.log(options.generateHelp());
} else {
  new Linter(translateOptions(cliOptions)).execute(cliOptions._).then(
    (result) => {
      const failed = result.errorCount || result.warningCount;

      if (failed) {
        console.log(formatTotal(result));
        process.exit(1);
      } else {
        process.exit(0);
      }
    },
    (err) => {
      console.log(err);
      process.exit(1);
    }
  );
}
