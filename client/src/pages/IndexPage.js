import Post from "../Post";
import {useEffect, useState} from "react";

export default function IndexPage() {
  const [posts,setPosts] = useState([]); //Set Posts into array , default state is empty array
  useEffect(() => {  //Run when component gets mounted 
    fetch('http://localhost:4000/post').then(response => { //Get request for posts for the homepage
      response.json().then(posts => {
        setPosts(posts);
      });
    });
  }, []);
  return (
    <>
      {posts.length > 0 && posts.map(post => (
        <Post {...post} />
      ))}
    </>
  );
}