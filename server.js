var express = require("express");
var cors = require("cors");
var bodyParser = require("body-parser");
var session = require("express-session");
const bcrypt = require("bcryptjs");
var mongoose = require("mongoose");

var app = express();

var User = require("./model/user_profile");
var isAuth = require("./is_auth/auth");
var Tweet = require("./model/tweet");
var Comment = require("./model/comment");


mongoose.set("useUnifiedTopology", true);
mongoose.set("useNewUrlParser", true);

var db = mongoose.connect("mongodb://localhost/socialApe");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(cors());

app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true
}))

//Session to be implemented for authentication

app.get("/signup",(req,res)=>{});

app.post("/signup",async(req,res)=>{
   
    const checkUser = await User.findOne({"email":req.body.email});
    if(checkUser){
        res.redirect("/signup");
    }
    else{
        const hashpassword = await bcrypt.hash(req.body.password, 12);
        const newUser = new User({
            email: req.body.email,
            password: hashpassword,
            userHandle: req.body.userHandle
        })

    newUser.save((err,status)=>{
        if(err){
            res.status(500).send({error:"Could not sign up"});
        }
        else{
            res.status(200).send("Profile created !");
        }
    })
}
});

app.get("/signin",(req,res)=>{
    res.send("Sign in");
});

app.post("/signin",async(req,res)=>{
    

    const user = await User.findOne({ "email":req.body.email/*, "password": req.body.password*/ });
    if (!user) {
        //res.redirect("/signin");
        res.send("Invalid Username");
    }
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if(!isMatch){
        res.send("Invalid Password");
    }
  
    req.session.isAuth = true;
    req.session.userId = user._id;
    req.session.userHandle = user.userHandle;
    req.session.following = user.following; //how to do this figure out
    res.redirect("/tweets");
    


})

app.post("/signout",(req,res)=>{
    req.session.destroy(err=>{
        if(err){
            res.status(500).send({error:err})
        }
        res.redirect("/signin");
    })
})









app.post("/tweets",isAuth, (req,res)=>{
    var tweet = new Tweet();
    var today = new Date();
    tweet.message = req.body.message;
    tweet.time = (today.getHours()+":"+today.getMinutes()+":"+today.getSeconds()+" , "+ today.getDay()+"/"+ today.getMonth()+"/"+today.getFullYear()).toString();
    //tweet.likes = 0;  //Handled in the model of the tweet

    tweet.save((err, postedTweet)=>{
        if(err){
            res.status(500).send({error:"Could not post the tweet"});
        }
        else{
            User.updateOne({_id: req.session.userId},{$addToSet:{ tweets: postedTweet._id}},(err,status)=>{
                if(err){
                    res.status(500).send({error:"Something went wrong."})
                }
            })
            res.status(200).send(postedTweet);
        }
    });    
})

app.get("/tweets",isAuth, (req,res)=>{

//    User.find(req.session.following, (err, users)=>{
//         if(err){
//             res.status(500).send({error:"Could not fetch shit"});
//         }
//         else{
//                 let tweets = users.map((user)=>{ return user.tweets});
//                 res.json(tweets);
//         }
        
//     })
            
        //     User.find({_id : req.session.following},(err,users)=>{
        //     if(err)
        //      { res.status(500).send({error:"Something went wrong."})}
        //     else{
        //         let newsfeed = users.map((user)=> {return user.tweets})
        //         console.log(newsfeed);
        //         Tweet.find({_id: newsfeed},(err,tweets)=>{
        //             console.log(tweets);
        //             res.status(200).send(tweets);
        //         })
        //     }
        // })

        User.find({_id: req.session.following})
        .populate({path:"tweets", model:"Tweet"})
        .exec((err,users)=>{
            if(err){
                res.status(500).send({error:"Something went wrong"})
            }
            else{
                let newsfeed = users.map((user)=> {return user.tweets});
                res.json(newsfeed);
               
            }
        })
   
})



app.put("/tweets/:tweetId",isAuth, (req,res)=>{
   Tweet.findOne({_id: req.params.tweetId},(err, tweet) =>{
        if(err){
            res.status(500).send({error:"Could not post the comment !"});
        }
        else{
            var comment = new Comment();
            comment.userHandle = req.session.userHandle;
            comment.message = req.body.message;
            Tweet.updateOne({_id: tweet._id},
                {
                   $push:{"comment":comment } 
                },
                (err, status)=>{
                    if(err){
                        res.status(500).send({error:"Something went wrong"});
                    }
                    else{
                        Tweet.findOne({_id: tweet._id},(err, updatedTweet)=>{
                            res.send(updatedTweet);
                        })
                    }
                }

            )

        }
    })

})

app.post("/search", isAuth, (req,res)=>{
    User.find({userHandle:req.body.userHandle},(err,users)=>{
        if(err){
            res.status(500).send("Search failed");
        }
        else{
           let userHandles = users.map((data)=>{return {userHandle:data.userHandle,_id:data._id}});
           res.json(userHandles);
        }
    })
})

app.post("/follow/:id",isAuth, (req,res)=>{
    User.updateOne({_id: req.params.id},{$addToSet:{ followers: req.session.userId}},(err,status)=>{
        if(err){
            res.status(500).send({error:"Something went wrong."})
        }
    })

    User.updateOne({_id:req.session.userId},{$addToSet:{following: req.params.id}},(err,status)=>{
        if(err){
            res.status(500).send({error:"Something went wrong"});
        }
    })
    res.status(200).send("yeh, started following");
})


app.get("/profile",isAuth,(req,res)=>{
    User.findOne({_id: req.session.userId})
    .populate({path:"tweets", model:"Tweet"})
    .populate({path:"following", model: "User"})
    .populate({path:"followers", model: "User"})
    .exec((err,user)=>{
        if(err){ res.status(500).send(err);}
        else{
            res.status(200).send(user);
        }
    })
})

app.get("/profile/:profileId",isAuth,(req,res)=>{
    User.findOne({_id: req.params.profileId})
    .populate({ path: "tweets", model: "Tweet" })
    .exec((err,user)=>{
        if(err){
            res.status(500).send({error:" No profile found!"});
        }
        else{
            res.status(200).send(user);
        }
})
})

app.listen(3000, console.log("The server is on"));