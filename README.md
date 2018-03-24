# openuni


## Setup

First, ensure that you have Node.js (version 4 or greater) and `npm` (preferably
the latest stable release) installed. Then,

``` bash
$ git clone https://github.com/potholderz/openuni.git
$ cd openuni/
$ cp .env.example .env
```

Edit `.env` to change various environment variables. Most importantly,
`JWT_SECRET` should **not** be left blank.

Install dependencies, build assets, and run the server:

``` bash
$ npm install
$ npm run build
$ npm start
```

### Creating Twitch client

Retrieving thumbnails, viewer counts, and live statuses for Twitch streams
requires a registered Twitch client.

  1. Go to <https://www.twitch.tv/settings/connections>
  2. Register a new developer application
  3. Name the application whatever you want. The important part is that the
     **Redirect URI** is set to `$API/oauth`. For example:

     ![](https://i.imgur.com/SqG6TNB.png)
  4. Edit `.env` to include your **Redirect URI**, **Client ID**, and **Client
     Secret**:

     ```
     TWITCH_CLIENT_ID=yourclientid
     TWITCH_CLIENT_SECRET=yourclientsecret
     TWITCH_REDIRECT_URI=http://localhost:3000/oauth
     ```
### Manual account setup

It might be desirable for administrators or developers to create user accounts
without the need to go through the Twitch OAuth setup.

  1. Create a new account in the database (the database file will be created
     after first running the server):
        ```
        $ sqlite3 ./openuni.sqlite
        sqlite> insert into users (id, service, channel, last_ip, last_seen, created_at, updated_at) VALUES ("PepoThinker", "twitch", "", "127.0.0.1", "", "", "");
        ```
  2. Forge the correct jwt cookie to be able to access this account:
        ```
        $ node
        > var jwt = require('jwt-simple');
        > jwt.encode({'id': 'PepoThinker'}, JWT_SECRET);
        ```
     With the default values (which should not be used), the output will look like this
        ```
        > jwt.encode({'id': 'PepoThinker'}, 'PepoThink');
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IlBlcG9UaGlua2VyIn0.5ZVCzh3TKuFlICoBohBvizvhDFTxvwfXrwiR6n5Und4'
        ```
    3. In your browser create a cookie for your Rustla2 domain (possibly
       `localhost`) named `jwt` (or whatever you set `JWT_NAME` to be), and set
       the value of it to the output of the above. Depending on your browser,
       you might need to install some addon for this.

    4. Reload the page. You should be logged in, which can be seen at the top
       right of the page.
