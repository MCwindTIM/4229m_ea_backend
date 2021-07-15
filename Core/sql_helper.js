const mysql = require('mysql');

module.exports = class sql_helper{
    constructor(main){
        this.main = main;
        this.connection;
    }

    //use to handle login function return true when login sucess, false when login failed
    //Android apps is using this service to handle login function
    login(username, password){
        this.connection = mysql.createConnection(this.main.config.sqlConnection);
        let handler = new Promise((resolve, reject) => {
            this.connection.connect();
            this.connection.query(`SELECT * FROM user WHERE username = '${username}' AND password = '${password}'`, (err, result) => {
                this.connection.end();
                if(err) return resolve(false);
                return result.length === 1 ? resolve(true) : resolve(false);
            });
        });
        return handler;
    }

    //chekcing user name exist in database?
    //register is calling this function to prevent multiple account with same username
    checkUserExist(username){
        this.connection = mysql.createConnection(this.main.config.sqlConnection);
        let handler = new Promise((resolve, reject) => {
            this.connection.connect();
            this.connection.query(`SELECT * FROM user WHERE username = '${username}'`, (err, result) => {
                this.connection.end();
                if(err) return resolve(false);
                if(result.length === 1) return resolve(true);
                return resolve(false);
            });
        });
        return handler;
    }

    //web controll remove book Database
    removeBook(bookID){
        let handler = new Promise((resolve, reject) => {
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`DELETE FROM books WHERE _id = '${bookID}'`, (err, result) => {
                this.connection.end();
                if(err) return resolve(false);
                return resolve(true);
            });
        })
        return handler;
    }

    //get 3 latest book's info link & return a object array that contain book's id & book's info link
    getRecommandBookList(){
        this.connection = mysql.createConnection(this.main.config.sqlConnection);
        let handler = new Promise((resolve, reject) => {
            this.connection.connect();
            this.connection.query(`SELECT _id, info_link FROM books ORDER BY _id DESC LIMIT 3`, (err, result) => {
                this.connection.end();
                if(err) return resolve({"error": err.toString()});
                return resolve(JSON.stringify({"RecommandBookList": result}));
            });
        });
        return handler;
    }

    //return all book record
    getAllBook(){
        this.connection = mysql.createConnection(this.main.config.sqlConnection);
        let handler = new Promise((resolve, reject) => {
            this.connection.connect();
            this.connection.query(`SELECT _id, info_link FROM books`, (err, result) => {
                this.connection.end();
                if(err) return resolve({"error": err.toString()});
                return resolve(JSON.stringify({"BookList": result}));
            });
        });
        return handler;
    }

    //insert record to the table
    //use to register account
    //Android apps is using this service to register account
    register(username, password){
            let handler = new Promise((resolve, reject) => {
            this.checkUserExist(username).then(v => {
                if(v) return resolve(false); //user exist;
                this.connection = mysql.createConnection(this.main.config.sqlConnection);
                this.connection.connect();
                this.connection.query(`INSERT INTO user (username, password) VALUES ('${username}', '${password}')`, (err, result) => {
                    this.connection.end();
                    if(err) return resolve(false);
                    return resolve(true);
                })
            });
        });
        return handler;
    }

    //select favourite book by using userID
    //→ return promise handler, resolve err when error resolve record when some record have been select from database
    getFavList(userID){
        let handler = new Promise((resolve, reject) => {
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`SELECT * FROM favorites WHERE user_id = ${userID}`, (err, result) => {
                this.connection.end();
                if(err) return resolve({"error": err.toString()});
                return resolve(JSON.stringify({"favorites": result}));
            });
        });
        return handler;
    }

    addBook(bookID) {
        let handler = new Promise((resolve, reject) => {
            let info_link = `http://mcwindftp.tk:3000/request_bookInfo?info_id=${bookID}`;
            let thumbnail_link = `http://mcwindftp.tk:3000/request_thumbnail?thumbnail_id=${bookID}`;
            let content_link = `http://mcwindftp.tk:3000/request_content?content_id=${bookID}`;
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`INSERT INTO books (info_link, thumbnail_link, content_link) VALUES ('${info_link}', '${thumbnail_link}', '${content_link}')`, (err) => {
                if(err) resolve(false);
                resolve(true);
            })
        });
        return handler;
    }

    //add favourites
    addFav(userID, bookID){
        let handler = new Promise((resolve, reject) => {
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`INSERT INTO favorites (user_id, book_id) VALUES ('${userID}', '${bookID}')`, (err, result) => {
                this.connection.end();
                if(err) return resolve(false);
                return resolve(true);
            })
        })
        return handler;
    }

    //remove favorites
    removeFav(userID, bookID){
        let handler = new Promise((resolve, reject) => {
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`DELETE FROM favorites WHERE user_id = '${userID}' AND book_id = '${bookID}'`, (err, result) => {
                this.connection.end();
                if(err) return resolve(false);
                return resolve(true);
            });
        })
        return handler;
    }

    returnNextAI(){
        let handler = new Promise((resolve, reject) =>{
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`SELECT AUTO_INCREMENT FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'book' AND TABLE_NAME = 'books';`, (err, result) => {
                this.connection.end();
                if(err) return resolve({"error": err.toString()});
                return resolve(result[0].AUTO_INCREMENT);
            });
        });
        return handler;
    }

    //giving username to get userID from databases
    getUserID(username){
        let handler = new Promise((resolve, reject) => {
            this.connection = mysql.createConnection(this.main.config.sqlConnection);
            this.connection.connect();
            this.connection.query(`SELECT _id FROM user WHERE username = '${username}'`, (err, result) => {
                this.connection.end();
                if(err) return resolve({"error": err.toString()});
                return resolve(JSON.stringify({"result": result[0]._id}));
            });
        });
        return handler;
    }
}