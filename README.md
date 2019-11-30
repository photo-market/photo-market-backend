# Photographers Database

[![Build Status](https://travis-ci.com/photo-market/photo-market-backend.svg?branch=master)](https://travis-ci.com/photo-market/photo-market-backend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=photo-market_photo-market-backend&metric=alert_status)](https://sonarcloud.io/dashboard?id=photo-market_photo-market-backend)

### Photos Type:
* Event photography
* Portrait
* Headshot
* Boudoir
* Creative
* Drone 
* Commercial

## Websockets
nginx don't support websocket，but it can proxy websocket connetions
```
location /chat/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
Source: http://nginx.org/en/docs/http/websocket.html

## Useful reading
* [The Twelve-Factor App](https://12factor.net)
* [Using Async/await in Express](https://zellwk.com/blog/async-await-express/)
* [Sessionless Authentication using JWTs (with Node + Express + Passport JS)](https://blog.usejournal.com/sessionless-authentication-withe-jwts-with-node-express-passport-js-69b059e4b22c)
* [The largest Node.js best practices list](https://github.com/goldbergyoni/nodebestpractices)
* [How to build real-time applications using WebSockets with AWS API Gateway and Lambda](https://www.freecodecamp.org/news/real-time-applications-using-websockets-with-aws-api-gateway-and-lambda-a5bb493e9452/)
* [Real-time applications with API Gateway WebSockets and AWS Lambda](https://serverless.com/blog/api-gateway-websockets-support/)
* [Build a Serverless Web Application](https://aws.amazon.com/getting-started/projects/build-serverless-web-app-lambda-apigateway-s3-dynamodb-cognito/)
* [Production Practices - Error Handling in Node.js](https://www.joyent.com/node-js/production/design/errors)
* [A Guide to Node.js Logging (2019-05-06)](https://www.twilio.com/blog/guide-node-js-logging)
* [Node.js Error Handling Best Practices: Ship With Confidence (NOVEMBER 28, 2018)](https://stackify.com/node-js-error-handling/)
* [Based on the following starter project:](https://github.com/sahat/hackathon-starter/)
* [REST API in nodejs](https://www.toptal.com/nodejs/secure-rest-api-in-nodejs)
* [Passport JS](https://www.freecodecamp.org/news/learn-how-to-handle-authentication-with-node-using-passport-js-4a56ed18e81e/)
* [Production best practices: performance and reliability](https://expressjs.com/en/advanced/best-practice-performance.html)
