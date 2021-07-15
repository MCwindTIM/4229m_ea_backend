const sql_helper = require("./sql_helper");
const web_server = require("./web_server");
const Config = require("./config");

module.exports = class Book_Server {
    constructor(option){
        this.config = new Config();
        this.web_server = new web_server(this);
        this.mysql = new sql_helper(this);
    }
}