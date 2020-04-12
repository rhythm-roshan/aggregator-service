const express = require('express');
const request = require('request');
const app = express();
const port = 7002;
var initTracer = require('jaeger-client').initTracer;
const opentracing = require("opentracing");
const bodyParser = require('body-parser');
const mysql = require('mysql');

var config = {
  'serviceName': 'aggregator-service',
  'local_agent': {
    'reporting_host': 'jaeger',
    'reporting_port': '6831',
},
  'reporter': {
    'logSpans': true    
  },
  'sampler': {	
    'type': 'const',
    'param': 1.0
  }
};
var options = {
  'tags': {
    'aggregator-service': '1.1.2'
  }
};

var tracer = initTracer(config, options);
opentracing.initGlobalTracer(tracer);
const usersource = process.env.USERS_URL||"http://localhost:7000";
const ordersource = process.env.ORDERS_URL||"http://localhost:7001";
var retVal1, retVal
app.get('/orderdetails/1', (req, res) => {    
    const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    const span = tracer.startSpan(req.path, { childOf: wireCtx })   
    span.setTag(opentracing.Tags.HTTP_METHOD, req.method)
  span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER)
  span.setTag(opentracing.Tags.HTTP_URL, req.path) 
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, {})
	request(usersource +'/users/1', { json: true }, (err, resp, body) => {
	  if (err || !body) {         
	  	  res.send("Error while getting user info from "+usersource) 
	  } else{       
        retVal1 = body;   	
        request(ordersource + '/orders/1', { json: true }, (err, resp, body) => {
            if (err || !body) {
                res.send("Error while getting order info from " + ordersource);
            }
            else {                            
                retVal = body;        
            }
        });	  
       
      }
    });

    res.send({
        "userDetails" : retVal1,
        "orders": retVal
    })
    span.log({'event': 'request_end'});
    span.finish();
})

app.use(express.static('public'))

app.listen(port, () => console.log(`Listening on port ${port}!`))
