const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10); //Generate salt used to hash password
const secret = 'asdfe45we45w345wegw345werjktjwertkj'; //Random string for JWT secret/private key 

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));  //Serve all the static files from uploads

mongoose.connect('mongodb+srv://blog:RhXXZ9B6YCvh92zG@cluster0.kavjgd7.mongodb.net/?retryWrites=true&w=majority');



//Endpoints
app.post('/register', async (req,res) => {
  const {username,password} = req.body;
  try{ //Add to DB, if the User is Unique
    const userDoc = await User.create({ //async function to create User
      username,
      password:bcrypt.hashSync(password,salt), //Hash password 
    });
    res.json(userDoc);
  } catch(e) {
    console.log(e);
    res.status(400).json(e); //Response if error exception, user is not created
  }
});

app.post('/login', async (req,res) => {
  //Grab then check if the hashed password and username are found in the database
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  const passOk = bcrypt.compareSync(password, userDoc.password); // Load password from your password DB, compare if its the as the password from the request 
  if (passOk) {
    //User logged In, respond with JSON web token, Payload inside token contains username and Id of User
    jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => { //callback function, returns error info, or created token using encrypted userInfo
      if (err) throw err;
      //Save cookie, to send everytime during request from app
      res.cookie('token', token).json({ // Set cookie - Send token information string as cookie in Reponse Header
        id:userDoc._id,
        username,
      });
    });
  } else {
    //User not logged in
    res.status(400).json('wrong credentials');
  }
});

app.get('/profile', (req,res) => { //Check if JWT token is valid, using secret key stored here on backend
  const {token} = req.cookies;
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout', (req,res) => { //Invalidate cookie - JWT token
  res.cookie('token', '').json('ok'); //Send token to just an empty string
});

app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
   //In order to preview files properly , Change orginal filename (w/o extension) to look like regular file .webp / .jpeg
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1]; //Extension of the uploaded file image
  const newPath = path+'.'+ext; //rename file to the have file name and extension
  fs.renameSync(path, newPath); //Add proper extension to filename

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body; //Grab JSON from request
    const postDoc = await Post.create({  //Save new CreatePost payload to database
      title,
      summary,
      content,
      cover:newPath, //Image, newPath to the file 
      author:info.id,
    });
    res.json(postDoc);
  });

});

app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});

app.get('/post', async (req,res) => { //Get request for posts, respond JSON all the posts
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1}) //Posts are in descending order from time created
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params; //With id fetch find single post
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})

app.listen(4000);