var http       = require('http'),
    port       = process.env.PORT || 3000,
    axios      = require('axios'),
    OAuth      = require('oauth-1.0a'),
    crypto     = require('crypto'),
    qs         = require('querystring'),
    util       = require('util'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session    = require('express-session'),
    express    = require('express'),
    app        = express(),
    QuickBooks = require('../index')


// Generic Express config
app.set('port', port)
app.set('views', 'views')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser('brad'))
app.use(session({resave: false, saveUninitialized: false, secret: 'smith'}));

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'))
})

// INSERT YOUR CONSUMER_KEY AND CONSUMER_SECRET HERE

var consumerKey    = 'ABGZMSnwLJH2PqH6P0ROD9MVY2UVbeal1p77cYyxuDt9phyGSU',
    consumerSecret = 'Bcjdsnj2D2tfzkuu4QJARk0oP2zxQDONbYlYHDMm'

app.get('/',function(req,res){
  res.redirect('/start');
})

app.get('/start', function(req, res) {
  res.render('intuit.ejs', {port:port, appCenter: QuickBooks.APP_CENTER_BASE})
})

app.get('/requestToken', function(req, res) {

  // Create an OAuth 1.0 instance
  var oauth = OAuth({
    consumer: {
      key: consumerKey,
      secret: consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    }
  });

  var requestData = {
    url: QuickBooks.REQUEST_TOKEN_URL,
    method: 'POST',
    data: {
       oauth_callback: 'http://localhost:' + port + '/callback/'
    }
  };

  var headers = oauth.toHeader(oauth.authorize(requestData, null));

  axios({
    url: requestData.url,
    method: requestData.method,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: new URLSearchParams(requestData.data).toString()
  })
  .then(function(response) {
    var requestToken = qs.parse(response.data);
    req.session.oauth_token_secret = requestToken.oauth_token_secret;
    console.log(requestToken);
    res.redirect(QuickBooks.APP_CENTER_URL + requestToken.oauth_token);
  })
  .catch(function(error) {
    console.log(error);
  });

  // var postBody = {
  //   url: QuickBooks.REQUEST_TOKEN_URL,
  //   oauth: {
  //     callback:        'http://localhost:' + port + '/callback/',
  //     consumer_key:    consumerKey,
  //     consumer_secret: consumerSecret
  //   }
  // }
  // request.post(postBody, function (e, r, data) {
  //   var requestToken = qs.parse(data)
  //   req.session.oauth_token_secret = requestToken.oauth_token_secret
  //   console.log(requestToken)
  //   res.redirect(QuickBooks.APP_CENTER_URL + requestToken.oauth_token)
  // })
})

app.get('/callback', function(req, res) {
  // Create an OAuth 1.0 instance
  var oauth = OAuth({
    consumer: {
      key: consumerKey,
      secret: consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    }
  });

  var requestData = {
    url: QuickBooks.REQUEST_TOKEN_URL,
    method: 'POST',
    data: {
       oauth_callback: 'http://localhost:' + port + '/callback/'
    }
  };

  var token = {
    token:           req.query.oauth_token,
    token_secret:    req.session.oauth_token_secret,
    verifier:        req.query.oauth_verifier,
    realmId:         req.query.realmId
  };

  var headers = oauth.toHeader(oauth.authorize(requestData, token));

  axios({
    url: QuickBooks.ACCESS_TOKEN_URL,
    method: requestData.method,
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: new URLSearchParams(requestData.data).toString()
  })
  .then(function(response) {
    var accessToken = qs.parse(response.data);
    console.log(accessToken)
    console.log(postBody.oauth.realmId)

    // save the access token somewhere on behalf of the logged in user
    qbo = new QuickBooks(consumerKey,
                         consumerSecret,
                         accessToken.oauth_token,
                         accessToken.oauth_token_secret,
                         postBody.oauth.realmId,
                         true, // use the Sandbox
                         true); // turn debugging on

    // test out account access
    qbo.findAccounts(function(_, accounts) {
      accounts.QueryResponse.Account.forEach(function(account) {
        console.log(account.Name)
      })
    })
  })
  .catch(function(error) {
    console.log(error);
  });

  // request.post(postBody, function (e, r, data) {
  //   var accessToken = qs.parse(data)
  //   console.log(accessToken)
  //   console.log(postBody.oauth.realmId)

  //   // save the access token somewhere on behalf of the logged in user
  //   qbo = new QuickBooks(consumerKey,
  //                        consumerSecret,
  //                        accessToken.oauth_token,
  //                        accessToken.oauth_token_secret,
  //                        postBody.oauth.realmId,
  //                        true, // use the Sandbox
  //                        true); // turn debugging on

  //   // test out account access
  //   qbo.findAccounts(function(_, accounts) {
  //     accounts.QueryResponse.Account.forEach(function(account) {
  //       console.log(account.Name)
  //     })
  //   })
  // })
  res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>')
})
