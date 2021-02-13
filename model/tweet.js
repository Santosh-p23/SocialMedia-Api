 var mongoose = require("mongoose");
 let Schema = mongoose.Schema;

 var tweet = new Schema({
    userHandle: String,
    message: String,
    time: String,
    likes: { type: Number, default: 0 },
    comment: Array
  

 });

 module.exports = mongoose.model("Tweet", tweet);