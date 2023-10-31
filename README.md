# eslint-parallel

Tiny eslint wrapper to allow executing javascript linting in parallel.

Forked from https://github.com/pgAdmin/eslint-parallel to support ESLint 8.

Note that this requires a patch to `eslint` to expose `FileEnumerator` and other options that are not currently exported by that package. See the patch at `./patches/eslint@8.52.0.patch` to copy it in your codebase.

## Install

```command
npm install @faulty/eslint-parallel
```

## Access CLI

```command
node_modules/.bin/eslint-parallel src/js/**
```

## Options

See [ESLint Docs](http://eslint.org/docs/user-guide/command-line-interface) for all the options

## API Usage

```javascript
import Linter from "eslint-parallel";
new Linter({
  cache: true,
  cwd: process.cwd(),
})
  .execute(["src/js/**"])
  .then(
    (result) => {
      const failed = result.errorCount || result.warningCount;

      if (failed) {
        // failed
      } else {
        // passed
      }
    },
    (err) => {
      console.log(err);
      process.exit(1);
    }
  );
```
