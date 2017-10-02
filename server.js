/**
 * Created by Furqan on 3/7/2016.
 */
var express= require('express');
var gcm = require('node-gcm');
//var http= require('http');
var cors= require('cors');
var app= express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var bodyParser= require('body-parser');
var oracledb = require('oracledb');
var cloudinary = require('cloudinary');
//var ngrok = require('ngrok');


app.use(bodyParser.json());


var device_token;
//var device_tokens1 = [];
//app.use(cors());

app.use(function(req, res, next){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.set('port',5000);
//app.use(express.static(__dirname + "/www"));



var connAttrs= {
  user: "university",
  password: "orcl",
  "connectString" : "(DESCRIPTION =(ADDRESS = (PROTOCOL = TCP)(HOST = YUMNAKHALID)(PORT = 1521))(CONNECT_DATA =(SERVER = DEDICATED)(SERVICE_NAME = XE)))"


}

//for notification register

// register done
io.on('connection', function(socket){

  console.log("in io");

  socket.on('join:room', function(data){
    console.log("join room");
    var room_name = data.room_name;
    socket.join(room_name);
  });


  socket.on('leave:room', function(msg){
    console.log("leave room");
    msg.text = msg.user + ' has left the room';
    socket.leave(msg.room);
    socket.in(msg.room).emit('message', msg);
  });


  socket.on('send:message', function(msg){
    console.log("msg is " + msg.text);
    socket.in(msg.room).emit('message', msg);
  });


});


app.get('/uploadimage', function (req, res) {
  console.log('in upload');
  var query = require('url').parse(req.url,true).query;
  console.log('uri is '+ query.uri);
  cloudinary.uploader.upload(query.uri, function (result) {
    console.log(result)
  });
})

//get tokens
app.get('/gettokens/:SENDER/:NOTICE', function (req, res) {

  var device_tokens1 = [];
  "use strict";
  var query = require('url').parse(req.url,true).query;
  console.log("event is"+query.EVENT);
  console.log("date is"+query.date);
console.log('RECEIVER is '+ query.RECIEVER);
  console.log('url is '+ query.URL);
  console.log('file is '+ query.FILE);
  console.log('desc is '+ query.desc);
  console.log('title'+ req.params.SENDER);
  console.log('msg '+ req.params.NOTICE);

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }
    if (query.RECIEVER == 'Students') {
      console.log('in student');
      connection.execute("select TOKEN from Student where TOKEN != 'null'",{}, {
        outFormat: oracledb.OBJECT // Return the result as Object
      }, function (err, result) {
        if (err || result.rows.length < 1) {
          res.set('Content-Type', 'application/json');
          var status = err ? 500 : 404;
          res.status(status).send(JSON.stringify({
            status: status,
            message: err ? "Error getting the user profile" : "User doesn't exist",
            detailed_message: err ? err.message : ""
          }));
        } else {
          // res.contentType('application/json').status(200).send(JSON.stringify(result.rows));
          res.send(JSON.stringify(result.rows));
          console.log(result.rows);
          for (var i = 0; i < result.rows.length; i++) {
            console.log(i + ' ' + result.rows[i].TOKEN);
            device_tokens1.push(result.rows[i].TOKEN);

          }
        }
        var message = new gcm.Message();
        var sender = new gcm.Sender('AIzaSyBhgozl-8sVTXPAswk-Jk3zM6WO_wPKTFQ');
        var date1 = new Date().toJSON().slice(0,10);

        //  console.log('title'+ req.params.SENDER);
        //  console.log('msg '+ req.params.NOTICE);
if(query.EVENT== "event")
{
  message.addData('title', req.params.SENDER);
  message.addData('message', query.desc);
  message.addData('sound', 'notification');
  message.addData('date1', query.date);
  message.addData('type1',"event");


  message.collapseKey = 'testing';
  message.delayWhileIdle = true;
  message.timeToLive = 3;

}
        else {
  message.addData('title', req.params.SENDER);
  message.addData('message', req.params.NOTICE);
  message.addData('sound', 'notification');
  message.addData('date1', date1);
  message.addData('file1', query.FILE);
  message.addData('url', query.URL);


  message.collapseKey = 'testing';
  message.delayWhileIdle = true;
  message.timeToLive = 3;


}
        sender.send(message, device_tokens1, 4, function(result) {
          console.log(result);
          console.log('device token length' + device_tokens1.length);
          for (var i = 0; i < device_tokens1.length; i++) {
            console.log('push sent to: ' + device_tokens1[i]);
          }
        });
        // Release the connection
        connection.release(

            function (err) {
              if (err) {
                console.error(err.message);
              } else {
                console.log("GET /student: Connection released");
              }
            });
      });
    }
    //if (query.RECIEVER == 'Faculty' || query.RECIEVER == 'All') {
    if (query.RECIEVER == 'Faculty(Teaching)' || query.RECIEVER == 'Faculty(Non-Teaching)' || query.RECIEVER == 'Faculty') {
      console.log('in if statement');
      var exequery;
      if(query.RECIEVER == 'Faculty(Teaching)')
      {
      //exequery="select TOKEN from Faculty where TYPE= 'teaching' and TOKEN != 'null'";
        exequery="select TOKEN from Faculty where TOKEN != 'null'";

      }
      else if(query.RECIEVER == 'Faculty(Non-Teaching)')
      {
        exequery="select TOKEN from Faculty where TYPE = 'nonteaching' and TOKEN != 'null'";
      }
      else
      {
        exequery="select TOKEN from Faculty where TOKEN != 'null'";
      }

      connection.execute(exequery,{}, {
        outFormat: oracledb.OBJECT // Return the result as Object
      }, function (err, result) {
        if (err || result.rows.length < 1) {
          res.set('Content-Type', 'application/json');
          var status = err ? 500 : 404;
          res.status(status).send(JSON.stringify({
            status: status,
            message: err ? "Error getting the user profile" : "User doesn't exist",
            detailed_message: err ? err.message : ""
          }));
        } else {
          // res.contentType('application/json').status(200).send(JSON.stringify(result.rows));
          res.send(JSON.stringify(result.rows));
          console.log(result.rows);
          for (var i = 0; i < result.rows.length; i++) {
            console.log(i + ' ' + result.rows[i].TOKEN);
            device_tokens1.push(result.rows[i].TOKEN);

          }
        }
        var message = new gcm.Message();
        var sender = new gcm.Sender('AIzaSyBhgozl-8sVTXPAswk-Jk3zM6WO_wPKTFQ');
        var date1 = new Date().toJSON().slice(0,10);

        //  console.log('title'+ req.params.SENDER);
        //  console.log('msg '+ req.params.NOTICE);

        if(query.EVENT== "event")
        {
          message.addData('title', req.params.SENDER);
          message.addData('message', query.desc);
          message.addData('sound', 'notification');
          message.addData('date1', query.date);
          message.addData('type1',"event");


          message.collapseKey = 'testing';
          message.delayWhileIdle = true;
          message.timeToLive = 3;

        }
else {

          message.addData('title', req.params.SENDER);
          message.addData('message', req.params.NOTICE);
          message.addData('sound', 'notification');
          message.addData('date1', date1);
          message.addData('file1', query.FILE);
          message.addData('url', query.URL);


          message.collapseKey = 'testing';
          message.delayWhileIdle = true;
          message.timeToLive = 3;

        }  // console.log('sending to: ' + device_token);

        // device_tokens.push(device_token);

        sender.send(message, device_tokens1, 4, function(result) {
          console.log(result);
          console.log('device token length' + device_tokens1.length);
          for (var i = 0; i < device_tokens1.length; i++) {
            console.log('push sent to: ' + device_tokens1[i]);
          }
        });
        // Release the connection
        connection.release(

            function (err) {
              if (err) {
                console.error(err.message);
              } else {
                console.log("GET /all tokens: Connection released");
              }
            });
      });
    }
    });
});
// get tokens

app.get('/admin/login', function (req, res) {
  "use strict";

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select * from ADMIN", {}, {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
        function (err) {
          if (err) {
            console.error(err.message);
          } else {
            console.log("GET /admin/login : Connection released");
          }
        });

    });

  });
});
app.post('/admin', function (req, res) {
  "use strict";
 // if ("application/json" !== req.get('Content-Type')) {
   //     res.set('Content-Type', 'application/json').status(415).send(JSON.stringify({
   //         status: 415,
   //         message: "Wrong content-type. Only application/json is supported",
   //         detailed_message: null
   //     }));
   //     return;
  //  }

  oracledb.getConnection(connAttrs, function (err, connection) {
  if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
   }
    console.log(req.body.SENDER);console.log(req.body.RECIEVER);console.log(req.body.NOTICE);
    connection.execute("INSERT INTO NOTIFICATION VALUES " +
      "(:SENDER, :RECIEVER, :NOTICE, :N_ID) ", [req.body.SENDER, req.body.RECIEVER,
        req.body.NOTICE,null], {
        autoCommit: true,
        outFormat: oracledb.OBJECT // Return the result as Object
      },
      function (err, result) {

        connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("POST /notification : Connection released");
            }
          });
        res.end();
      });
  });
});
app.get('/student/:ID/:PASSWORD', function (req, res) {
  "use strict";

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select s.BATCH ,s.DEPT_ID,s.STD_NAME , s.SECTION,s.ENROLLMENT_NO,s.CELL_NO,d.DEPT_NAME from STUDENT s,DEPARTMENT d where STD_ID=:ID and STD_PASSWORD= :PASSWORD and s.DEPT_ID=d.DEPT_ID", [req.params.ID,req.params.PASSWORD], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      console.log(req.params.ID);console.log(req.params.PASSWORD);
      if (err || result.rows.length < 1) {
        console.log(0);
        res.sendStatus(JSON.stringify('0'));

      } else {

        //res.sendStatus(JSON.stringify('1'));
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /student/" + req.params.ID + req.params.PASSWORD +" : Connection released");
            }
          });
    });
  });
});





// update again
// Build UPDATE statement and prepare bind variables
var buildUpdateStatement = function buildUpdateStatement(req) {
  "use strict";

  var statement = "",
      bindValues = {};
  //if (req.body.TOKEN) {
  //  statement += "TOKEN = :TOKEN";
  //  bindValues.TOKEN = req.body.TOKEN;
  //}
  if (req.body.TOKEN) {
    statement += "TOKEN = :TOKEN";
    bindValues.TOKEN = req.body.TOKEN;
  }
  statement += " WHERE STD_ID = :STD_ID";
  bindValues.STD_ID = req.params.STD_ID;
  statement = "UPDATE STUDENT SET " + statement;
  console.log('bad m');
  return {
    statement: statement,
    bindValues: bindValues
  };
};

// Http method: PUT
// URI        : /user_profiles/:USER_NAME
// Update the profile of user given in :USER_NAME
app.put('/pp/:STD_ID', function (req, res) {
  "use strict";
  console.log('in put');
  console.log(req.params.STD_ID);
  console.log(req.body.TOKEN);
  // if ("application/json" !== req.get('Content-Type')) {
  //     res.set('Content-Type', 'application/json').status(415).send(JSON.stringify({
  //         status: 415,
  //         message: "Wrong content-type. Only application/json is supported",
  //         detailed_message: null
  //     }));
  //     return;
  //}

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

  //  var updateStatement = buildUpdateStatement(req);
  //  connection.execute(updateStatement.statement, updateStatement.bindValues, {
    connection.execute("UPDATE STUDENT set TOKEN=:TOKEN where STD_ID=:STD_ID ", [req.body.TOKEN, req.params.STD_ID], {
          autoCommit: true,
          outFormat: oracledb.OBJECT // Return the result as Object
        },
        function (err, result) {
              if (err || result.rowsAffected === 0) {
          // Error
                  res.set('Content-Type', 'application/json');
                  res.status(400).send(JSON.stringify({
                      status: 400,
                      message: err ? "Input Error" : "User doesn't exist",
                      detailed_message: err ? err.message : ""
                  }));
              } else {
          // Resource successfully updated. Sending an empty response body.
                  res.status(204).end();
            }
          // Release the connection
          connection.release(
              function (err) {
                if (err) {
                  console.error(err.message);
                } else {

                  console.log("PUT /pp/" + req.params.STD_ID + " : Connection released ");
                }
              });
        //  res.send('ok');
       //   res.end();
        });
  });
});

//update again

//faculty token
var buildUpdateStatement1 = function buildUpdateStatement1(req) {
  "use strict";

  var statement = "",
      bindValues = {};
  //if (req.body.TOKEN) {
  //  statement += "TOKEN = :TOKEN";
  //  bindValues.TOKEN = req.body.TOKEN;
  //}
  if (req.body.TOKEN) {
    statement += "TOKEN = :TOKEN";
    bindValues.TOKEN = req.body.TOKEN;
  }
  statement += " WHERE PNO = :PNO";
  bindValues.PNO = req.params.PNO;
  statement = "UPDATE FACULTY SET " + statement;
  console.log('bad m');
  return {
    statement: statement,
    bindValues: bindValues
  };
};

// Http method: PUT
// URI        : /user_profiles/:USER_NAME
// Update the profile of user given in :USER_NAME
app.put('/ppfaculty/:PNO', function (req, res) {
  "use strict";
  console.log('in put');
  console.log(req.params.PNO);
  console.log(req.body.TOKEN);
  // if ("application/json" !== req.get('Content-Type')) {
  //     res.set('Content-Type', 'application/json').status(415).send(JSON.stringify({
  //         status: 415,
  //         message: "Wrong content-type. Only application/json is supported",
  //         detailed_message: null
  //     }));
  //     return;
  //}

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    //  var updateStatement = buildUpdateStatement(req);
    //  connection.execute(updateStatement.statement, updateStatement.bindValues, {
    connection.execute("UPDATE FACULTY set TOKEN=:TOKEN where PNO=:PNO ", [req.body.TOKEN, req.params.PNO], {
          autoCommit: true,
          outFormat: oracledb.OBJECT // Return the result as Object
        },
        function (err, result) {
          if (err || result.rowsAffected === 0) {
            // Error
            res.set('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify({
              status: 400,
              message: err ? "Input Error" : "User doesn't exist",
              detailed_message: err ? err.message : ""
            }));
          } else {
            // Resource successfully updated. Sending an empty response body.
            res.status(204).end();
          }
          // Release the connection
          connection.release(
              function (err) {
                if (err) {
                  console.error(err.message);
                } else {

                  console.log("PUT /ppfaculty/" + req.params.PNO + " : Connection released ");
                }
              });
          //  res.send('ok');
          //   res.end();
        });
  });
});

//update again


//checktoken
app.get('/cellverify/:CELLNO', function (req, res) {
  "use strict";
  var query = require('url').parse(req.url,true).query;
  console.log('CELLNO is '+ req.params.CELLNO);
  //res.send('ok');
  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select f.PNO,f.F_NAME,f.CELL_NO,f.EMAIL,f.TYPE,d.DEPT_NAME from FACULTY f,DEPARTMENT d where f.CELL_NO=:CELLNO and f.DEPT_ID= d.DEPT_ID", [req.params.CELLNO], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {

      if (err || result.rows.length < 1) {
        console.log(0);
        res.sendStatus(JSON.stringify('0'));

      } else {

        //res.sendStatus(JSON.stringify('1'));
        //res.sendStatus(result.rows);
        res.send(JSON.stringify(result.rows));
        console.log(result.rows[0].PNO);
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /checkcell : Connection released");
            }
          });
    });

  });
});
//fetch courses
app.get('/fetchcourses/:PNO', function (req, res) {
  "use strict";
console.log('pno' +req.params.PNO);
  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select c.C_ID,cd.DEPT_ID, c.C_NAME,d.DEPT_NAME,cd.BATCH,cd.SEC from COURSE c,DEPARTMENT d, CD cd where cd.PNO=:PNO AND c.C_ID=cd.C_ID AND d.DEPT_ID=cd.DEPT_ID", [req.params.PNO], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /fetchrecord : Connection released");
            }
          });

    });

  });
});
//fetch courses

//get student token for faculty
app.get('/faculty/getstudenttoken/:title/:msg', function (req, res) {

  var device_tokens1 = [];
  "use strict";
  var query = require('url').parse(req.url,true).query;
  console.log('cname is '+ query.C_NAME);
  console.log('dname is '+ query.DEPT_NAME);
  console.log('batch is '+ query.BATCH);
  console.log('sec is '+ query.SEC);
  console.log('title'+ req.params.title);
  console.log('msg '+ req.params.msg);

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }
     // console.log('in if statement');
      connection.execute("select token,std_name,CELL_NO from student s ,department d where d.dept_name=:DEPT_NAME and batch=:BATCH and SECTION=:SEC and d.dept_id=s.dept_id and TOKEN != 'null'",[query.DEPT_NAME,query.BATCH,query.SEC], {
        outFormat: oracledb.OBJECT // Return the result as Object
      }, function (err, result) {
        if (err || result.rows.length < 1) {
          res.set('Content-Type', 'application/json');
          var status = err ? 500 : 404;
          res.status(status).send(JSON.stringify({
            status: status,
            message: err ? "Error getting the user profile" : "User doesn't exist",
            detailed_message: err ? err.message : ""
          }));
        } else {
          // res.contentType('application/json').status(200).send(JSON.stringify(result.rows));
          res.send(JSON.stringify(result.rows));
          console.log(result.rows);
          for(var i=0;i<result.rows.length;i++) {
            console.log( i+ ' ' +result.rows[i].TOKEN);
            device_tokens1.push(result.rows[i].TOKEN);

          }
        }
        var message = new gcm.Message();
        var sender = new gcm.Sender('AIzaSyBhgozl-8sVTXPAswk-Jk3zM6WO_wPKTFQ');
        var date1 = new Date().toJSON().slice(0,10);
        //  console.log('title'+ req.params.SENDER);
        //  console.log('msg '+ req.params.NOTICE);

        message.addData('title', req.params.title);
        message.addData('message', req.params.msg);
        message.addData('sound', 'notification');
        message.addData('date1', date1);
        message.addData('type1','faculty');

        message.collapseKey = 'testing';
        message.delayWhileIdle = true;
        message.timeToLive = 3;

        // console.log('sending to: ' + device_token);

        // device_tokens.push(device_token);

        sender.send(message, device_tokens1, 4, function(result) {
          console.log(result);
          console.log('device token length' + device_tokens1.length);
          for (var i = 0; i < device_tokens1.length; i++) {
            console.log('push sent to: ' + device_tokens1[i]);
          }
        });
        // Release the connection
        connection.release(
            function (err) {
              if (err) {
                console.error(err.message);
              } else {
                console.log("GET /faculty/getstudenttoken/"  + " : Connection released");
              }
            });
      });

  });
});

//techlectureupload
app.post('/lecupload', function (req, res) {
  "use strict";
  console.log('/lecupload');
  console.log(req.body.C_ID);
  console.log(req.body.DEPT);
  console.log(req.body.BATCH);
  console.log(req.body.SEC);
  console.log(req.body.rurl);
  console.log(req.body.filename);
  console.log(req.body.pubid);
  console.log('/lecupload');

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("INSERT INTO FILES VALUES " +
        "(:FID, :C_ID, :DEPT_ID, :BATCH , :SEC , :URL , :FILENAME,:PUBID) ", [null,req.body.C_ID, req.body.DEPT,
          req.body.BATCH , req.body.SEC, req.body.rurl , req.body.filename,req.body.pubid], {
          autoCommit: true,
          outFormat: oracledb.OBJECT // Return the result as Object
        },
        function (err, result) {

          connection.release(
              function (err) {
                if (err) {
                  console.error(err.message);
                } else {
                  console.log("POST /lecupload : Connection released");
                }
              });
          res.end();
        });
  });
});

//techlectureupload

//get all uploaded files for teacher and students
app.get('/fetchfiles', function (req, res) {
  "use strict";
  var query = require('url').parse(req.url,true).query;
  console.log('cname is '+ query.C_ID);
  console.log('dname is '+ query.DEPT_ID);
  console.log('batch is '+ query.BATCH);
  console.log('sec is '+ query.SEC);
  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select FID,FILENAME,URL,PUBID from FILES where C_ID=:C_ID and DEPT_ID=:DEPT_ID and BATCH=:BATCH and SEC=:SEC", [query.C_ID,query.DEPT_ID,query.BATCH,query.SEC], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /fetchrecord : Connection released");
            }
          });

    });

  });
});

//getalluploadedfiles
app.get('/deletefiles/:PUBID', function (req, res) {
  "use strict";
  console.log('delete files');
console.log('pubid is ' + req.params.PUBID);

  cloudinary.config({
    cloud_name: 'dpibroyqu',
    api_key: '159937379289765',
    api_secret: 'CL37FVpUxlcvr7ot2Qv9_SjM07k'
  });

  cloudinary.uploader.destroy(req.params.PUBID, function(result) { console.log(result) }, { resource_type: "raw" });

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("DELETE FROM FILES WHERE PUBID = :pubid", [req.params.PUBID], {
      autoCommit: true,
      outFormat: oracledb.OBJECT
    }, function (err, result) {
      if (err || result.rowsAffected === 0) {
        // Error
        res.set('Content-Type', 'application/json');
        res.status(400).send(JSON.stringify({
          status: 400,
          message: err ? "Input Error" : "User doesn't exist",
          detailed_message: err ? err.message : ""
        }));
      } else {
        // Resource successfully deleted. Sending an empty response body.
        res.status(204).end();
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("DELETE /files/" + req.params.pubid + " : Connection released");
            }
          });

    });
  });
});

//stdlecture
app.get('/studentcourses/:ID', function (req, res) {
  "use strict";
  console.log('id: '+ req.params.ID);
  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select c.C_NAME,c.C_ID,s.STD_ID from course c , student s where c.SEMESTER=s.SEMESTER and c.DEPT_ID=s.DEPT_ID and s.STD_ID=:ID ", [req.params.ID], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /stdcourses : Connection released");
            }
          });

    });

  });
});

//stdlecture

//event upload
app.post('/postevents', function (req, res) {
  "use strict";
  console.log(req.body.title);
  console.log(req.body.desc);
  console.log(req.body.date);


  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("INSERT INTO EVENTS VALUES " +
        "(:E_NO, :E_TITLE, :E_DESC, :FILENAME ,:URL,:E_DATE) ", [null,req.body.title, req.body.desc,
          req.body.filename,req.body.url,req.body.date ], {
          autoCommit: true,
          outFormat: oracledb.OBJECT // Return the result as Object
        },
        function (err, result) {

          connection.release(
              function (err) {
                if (err) {
                  console.error(err.message);
                } else {
                  console.log("POST /eventupload : Connection released");
                }
              });
          res.end();
        });
  });
});

app.get('/getevents', function (req, res) {
  "use strict";

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select * from EVENTS", {}, {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /getevents: Connection released");
            }
          });

    });

  });
});

app.post('/storemsg', function (req, res) {
  "use strict";

  console.log(req.body.ROOM);
  console.log(req.body.USER1);
  console.log(req.body.TEXT);
  console.log(req.body.TIME);


  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("INSERT INTO FILEREVIEWS VALUES " +
        "(:ROOM, :USER1, :TEXT, :TIME) ", [req.body.ROOM, req.body.USER1,
          req.body.TEXT,req.body.TIME ], {
          autoCommit: true,
          outFormat: oracledb.OBJECT // Return the result as Object
        },
        function (err, result) {

          connection.release(
              function (err) {
                if (err) {
                  console.error(err.message);
                } else {
                  console.log("POST /storemsg : Connection released");
                }
              });
          res.end();
        });
  });
});

app.get('/getcomments/:FID', function (req, res) {
  "use strict";
  console.log('FID' +req.params.FID);
  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select * from FILEREVIEWS where ROOM=:FID", [req.params.FID], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /getcomments : Connection released");
            }
          });

    });

  });
});


app.get('/fetchteacann', function (req, res) {
  "use strict";
  var query = require('url').parse(req.url,true).query;

  console.log('pno is ' + query.qrpno);
  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select * from ANNOUNCEMENT a where a.SENDER=:qrpno", [query.qrpno], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        console.log("SUCCESS");
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /fetchannouncemnts : Connection released");
            }
          });

    });

  });
});

app.post('/scanresult', function (req, res) {
  "use strict";
  console.log(req.body.pno);
  console.log(req.body.sessionid);


  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json').status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("INSERT INTO WEB VALUES " +
        "(:REQUESTNO, :SESSIONID) ", [req.body.pno,req.body.sessionid], {
          autoCommit: true,
          outFormat: oracledb.OBJECT // Return the result as Object
        },
        function (err, result) {

          connection.release(
              function (err) {
                if (err) {
                  console.error(err.message);
                } else {
                  console.log("POST /eventupload : Connection released");
                }
              });
          res.end();
        });
  });
});

app.get('/checksessionid/:sessionid', function (req, res) {
  "use strict";
  console.log("session id is"+ req.params.sessionid);

  oracledb.getConnection(connAttrs, function (err, connection) {
    if (err) {
      // Error connecting to DB
      res.set('Content-Type', 'application/json');
      res.status(500).send(JSON.stringify({
        status: 500,
        message: "Error connecting to DB",
        detailed_message: err.message
      }));
      return;
    }

    connection.execute("select REQUESTNO from WEB where SESSIONID=:sessionid", [req.params.sessionid], {
      outFormat: oracledb.OBJECT // Return the result as Object
    }, function (err, result) {
      if (err) {
        res.set('Content-Type', 'application/json');
        res.status(500).send(JSON.stringify({
          status: 500,
          message: "Error getting notification",
          detailed_message: err.message
        }));
      } else {
        console.log("SUCCESS");
        res.contentType('application/json').status(200);
        res.send(JSON.stringify(result.rows));
        console.log(JSON.stringify(result.rows));
      }
      // Release the connection
      connection.release(
          function (err) {
            if (err) {
              console.error(err.message);
            } else {
              console.log("GET /checksessionid : Connection released");
            }
          });

    });

  });
});



http.listen(5000, function(){
  console.log('listening on *:5000');
});


//ngrok.connect(function (err, url) {
//  console.log('url is' + url);
//});



//app.listen(3000);
//console.log("server is on");
