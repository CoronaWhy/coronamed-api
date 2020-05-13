# Koa ES7 Boilerplate

✨ A simple boilerplate for writing `async-await`-based Koa API's using `babel` for **Node v8.0 and above!**. 🚀

## Installation

Clone this repo and adjust details in `package.json`. Remove the `.git` directory and `git init` to start fresh.

Read on to learn how to actually start being productive.

`npm init`

## Usage
* `npm start` Start server on live mode
* `npm run dev` Start server on dev mode with nodemon
* `npm test` Run jest tests

## Run console scripts
npm run console -- `script name`

## Run console scripts on heroku
heroku run npm run console -- `script name`

## Run worker instance
npm run job -- `script name`

## Directory structure

The repository root contains auxiliary files like `package.json`, `.gitignore`, etc.


- `app`: the actual source for the app goes here. Duh.
  - `api`: API endpoints go here, and are loaded at startup. Please see the index.is for details.
  - `lib`: stuff that helps the app start up, e.g. environment, logger, the container configuration, etc.
  - `middlewares`: custom app middleware.
  - `services`: application services.
  - `constants`: application constants or enums.
  - `errors`: application error classes.
  - `models`: mongoose schemas and models.
  - `utils`: your useful scripts.
- `app_console`: console scripts, please see the npm run console for details.
- `app_worker`: worker scripts, please see the npm run job for details.
- `bin`: files that are usually executed by `npm run` scripts, e.g. starting the server.
- `config`: your application configuration for different environments.
- `logs`: application log files.
- `public`: public files, by default available at `/public`.
- `static`: application static files.

## Middleware

Middleware is located in the `app/middlewares` folder and is _not_ automatically loaded - they should be installed in `bin/http-server`.

# Author

- Andrew L.