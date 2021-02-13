var mongoose = require("mongoose");
 let Schema = mongoose.Schema;

 var ObjectId = mongoose.Schema.Types.ObjectId;

 var user = new Schema({
    userHandle: String,
    email: String,
    password: String,
    following:[{type: ObjectId, ref: "User"}],
    followers: [{type: ObjectId, ref: "User"}],
    tweets: [{ type: ObjectId, ref: "Tweet"}],
   
 });

 module.exports = mongoose.model("User", user);