const http = require('http');
const express = require('express');
const url = require('url');
const fs = require('fs');
const server = require('socket.io');
const formidable = require('formidable');
const unzipper = require('unzipper');
const EventEmitter = require('events').EventEmitter;

const multer  = require('multer')

const fileUpload = require('express-fileupload');

module.exports = class web_server {
    constructor(main){
        //init
        this.main = main
        this.app = express();
        this.event = new EventEmitter();
        this.event.setMaxListeners(0);

        this.app.use(require('body-parser').urlencoded({ extended: true }));
        this.server = http.createServer(this.app);
        this.socket_io = new server(this.server);
        this.server.port = this.main.config.port || 3000;
        //↓↓↓↓↓↓ this object is totally bull shit
        this.mime = {
            html: 'text/html',
            txt: 'text/plain',
            css: 'text/css',
            gif: 'image/gif',
            jpg: 'image/jpeg',
            png: 'image/png',
            svg: 'image/svg+xml',
            js: 'application/javascript'
        };
        //start server
        this.server.listen(this.server.port, function(){
            console.log("Listening port 3000!");
        });

        //start socketio
        this.socket_io.on('connection', socket => {
            //socket on event
            socket.on('disconnect', ()=> {
                //disconnect
            });
            this.event.on('ListChange', () => {
				socket.emit('ListChange');
			})
            socket.on('request_all_book', () => {
                this.main.mysql.getAllBook().then(record => {
                    // res.send(record);
                    
                    let JSONrecord = JSON.parse(record).BookList;
                    this.modifyData(JSONrecord, null).then(modifiedRecord => {
                            socket.emit('resAllBookData', {"BookList": modifiedRecord});
                    });
                });
            });

            socket.on('removeData', data => {
                this.main.mysql.removeBook(data.bookID).then(v => {
                    if(v){
                        socket.emit('removeSucess');
                        this.event.emit('ListChange');
                    }else{
                        socket.emit('removeFailed');
                    }
                });
                this.main.mysql.removeBookFavRecords(data.bookID).then(_ => {});
            })
            
        });
        
        //html css js-------------------------------------------------
        this.app.get('/web_controll_panel', (req, res) => {
            fs.readFile(`${__dirname}/../html/index.html`, (err, data) => {
                res.send(data.toString());
            });
        });
        this.app.get('/web_controll_panel/css/style.css', (req, res) => {
            fs.readFile(`${__dirname}/../html/css/style.css`, (err, data) => {
                
                res.set('Content-Type', 'text/css');
                res.send(data);
            });
        });

        this.app.get('/web_controll_panel/js/index.js', (req, res) => {
            fs.readFile(`${__dirname}/../html/js/index.js`, (err, data) => {
                res.set('Content-Type', 'application/javascript');
                res.send(data);
            });
        });

        this.app.get('/web_controll_panel/upload', (req, res) => {
            fs.readFile(`${__dirname}/../html/upload.html`, (err, data) => {
                res.send(data.toString());
            });
        });

        //--------------------------------------------end of html css js

        //--------------------------------------------Web controller Book upload 
        var upload = multer({ dest: './Book/uploadTMP' });
        var cpUpload = upload.fields([
            {name: 'thumbnail_upload', maxCount: 1},
            {name: 'zip_upload', maxCount: 1}
        ]);
        this.app.post('/bookUpload', cpUpload, async (req, res, next) => {
            let title = req.body.title;
            let author = req.body.author;
            let files = req.files;
            //get Last BookID and + 1
            this.main.mysql.returnNextAI().then((result) => {
                let bookID = parseInt(result);
                
                try{
                    fs.createReadStream(`${__dirname}/../${files.thumbnail_upload[0].path}`).pipe(fs.createWriteStream(`${__dirname}/../Book/Thumbnail/${bookID}.jpg`));
                    if(!fs.existsSync(`${__dirname}/../Book/Content/${bookID}/`)) fs.mkdirSync(`${__dirname}/../Book/Content/${bookID}/`);

                    fs.createReadStream(`${__dirname}/../${files.zip_upload[0].path}`).pipe(unzipper.Extract({ path: `${__dirname}/../Book/Content/${bookID}` }));
                    this.createInfoJSON(bookID, title, author);
                    // res.end();
                    this.main.mysql.addBook(bookID).then(v => {
                        if(v){
                            res.send(JSON.stringify({status: v}))
                            
                            this.event.emit('ListChange');
                        }else{
                            res.send(JSON.stringify({status: v}))
                        }
                    })
                }catch(e){
                    console.log(e)
                    res.send(JSON.stringify({error: e}))
                }
            })
        })

        //--------------------------------------------end of Book upload

        //response Thumbnail of book with given id
        this.app.get('/request_thumbnail', (req, res) => {
            let rs = fs.createReadStream(`${__dirname}/../Book/Thumbnail/${req.query.thumbnail_id}.jpg`);
            rs.on('open', () => {
                res.set('Content-Type', 'image/jpeg');
                rs.pipe(res);
            });
        });
        
        //response JSON format book title&author with given id
        this.app.get('/request_bookInfo', (req, res) => {
            fs.readFile(`${__dirname}/../Book/Info/${req.query.info_id}.json`, (err, data) => {
                if(err) {
                    res.writeHead(404);
                    res.write(`404 Server Error`);
                    res.end();
                }else{
                    res.send(data.toString());
                    res.end();
                }
            });
        });

        //response plain text of book content with given id
        this.app.get('/request_content', (req, res) => {
            if(!req.query || req.query.content_id == "" || req.query.page == "") return res.send(JSON.stringify({"Status": "Missing query"}));

            let fileReader = fs.createReadStream(`${__dirname}/../Book/Content/${req.query.content_id}/${req.query.page}.jpg`);
            fileReader.on('error', err => {
                console.log(err);
            })
            fileReader.on('open', () => {
                res.set('Content-Type', 'image/jpeg');
                fileReader.pipe(res);
            });

        });


        //response json object array with list of book info link & id
        this.app.get('/request_RecommandBookList', (req, res) => {
            this.main.mysql.getRecommandBookList().then(record => {
                res.send(record);
                res.end();
            });
        });
        
        //response json object array with list of book info link & id
        this.app.get('/request_AllBookList', (req, res) => {
            this.main.mysql.getAllBook().then(record => {
                res.send(record);
                res.end();
            });
        });

        //get User fav book list
        this.app.get('/getFavList', (req, res) => {
            if(!req.query.userID || req.query.userID === "") return res.send({"error": "Missing query"});
            this.main.mysql.getFavList(req.query.userID).then(record => {
                res.send(record);
                res.end();
            })
        });

        //get UserID by using username
        this.app.get('/getUserID', (req, res) => {
            if(!req.query.username || req.query.username === "") return res.send({"error": "Missing query"});
            this.main.mysql.getUserID(req.query.username).then(record => {
                res.send(record);
                res.end();
            })
        });

        this.app.get('/addFav', (req, res) => {
            if(!req.query.userID || req.query.userID === "" || !req.query.bookID || req.query.bookID === "") return res.send({error: "Missing query"});
            this.main.mysql.addFav(req.query.userID, req.query.bookID).then(v => {
                if(v){
                    res.send(JSON.stringify({Status: "Sucessful"}));
                    res.end();
                }else{
                    res.send(JSON.stringify({Status: "Failed"}));
                    res.end();
                }

            })
        });


        this.app.get('/removeFav', (req, res) => {
            if(!req.query.userID || req.query.userID === "" || !req.query.bookID || req.query.bookID === "") return res.send({error: "Missing query"});
            this.main.mysql.removeFav(req.query.userID, req.query.bookID).then(v => {
                if(v){
                    res.send(JSON.stringify({Status: "Sucessful"}));
                    res.end();
                }else{
                    res.send(JSON.stringify({Status: "Failed"}));
                    res.end();
                }

            })
        });

        //check totalPage by using book id
        this.app.get('/totalPage', (req, res) => {
            if(!req.query.bookID || req.query.bookID === "") return res.send({"error": "Missing query"});
            let dir = `${__dirname}/../Book/Content/${req.query.bookID}/`;
            fs.readdir(dir, (err, files) => {
                res.send(JSON.stringify({totalPage: `${files.length}`}));
            });
        })


        //use to login (android app calling this function)
        // --Using sql_helper
        this.app.get('/login', async (req, res) => {
            this.main.mysql.login(req.query.username, req.query.password).then(v =>{
                if(v){
                    res.send(JSON.stringify({Login: "Sucess"}));
                    res.end();
                }else{
                    res.send(JSON.stringify({Login: "Failed"}));
                    res.end();
                }
                });
        });

        //register account (android app calling this function)
        // --Using sql_helper
        this.app.get('/register', async (req, res) => {
            this.main.mysql.register(req.query.username, req.query.password).then(v =>{
                if(v){
                    res.send(JSON.stringify({Register: "Sucess"}));
                    res.end();
                }else{
                    res.send(JSON.stringify({Register: "Failed"}));
                    res.end();
                }
                });
        });

        this.app.get('/searchBooks', async (req, res) =>{
            this.main.mysql.getAllBook().then(record => {
                // res.send(record);
                
                let JSONrecord = JSON.parse(record).BookList;
                this.modifyData(JSONrecord, req.query.searchString).then(modifiedRecord => {
                        res.send(JSON.stringify({"BookList": modifiedRecord}));
                        res.end();
                });
            });
        });

    }
    
    modifyData(JSONrecord, searchString){
        let handler = new Promise((resolve, reject) => {
            let newJSONrecord = [];
            if(searchString != null || searchString != undefined){
                JSONrecord.forEach(record => {
                    let rfs = fs.readFileSync(`${__dirname}/../Book/Info/${record._id}.json`);
                    record.title = JSON.parse(rfs).title;
                    record.author = JSON.parse(rfs).author;
                });
                newJSONrecord = JSONrecord.filter(record => record.title.toLowerCase().includes(searchString.toLowerCase()) || record.author.toLowerCase().includes(searchString.toLowerCase()));
            }else{
                JSONrecord.forEach(record => {
                    let rfs = fs.readFileSync(`${__dirname}/../Book/Info/${record._id}.json`);
                    record.title = JSON.parse(rfs).title;
                    record.author = JSON.parse(rfs).author;
                    newJSONrecord.push(record);
                });
            }
            resolve(newJSONrecord);
        })
        return handler;
    }


    createInfoJSON(bookID, title, author){
        let path = `${__dirname}/../Book/Info/`;
        let filename = `${bookID}.json`;
        fs.writeFile(path + filename, JSON.stringify({title: title, author: author}), (_) => {});
    }
}