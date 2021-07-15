module.exports = class Config{
    constructor(){
        this.sqlConnection = {
            //sql host
            host: 'localhost',
            //sql usernames
            user: 'root',
            //sql password
            password: 'usbw',
            //sql server port
            port: '3307',
            //sql database name
            database: 'book'
        };
        //↓↓↓↓↓↓↓ totally bull shit (useless)
        this.port = 3000;

    }
}