

import mongoose from 'mongoose';  //data modeller for mongodb database

let isConnected = false; //variable to track connection status.

export const connectToDB =async () => {
    mongoose.set('strictQuery', true);

    if(!process.env.MONGODB_URI) return console.log('MONGODB_URI is not defined'); //checking for connection
    if(isConnected) return console.log('=> using existing database connection');

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        isConnected = true;
        console.log('MongoDB Connected');
        
    } catch (error) {
        console.log(error)
        
    }
    
}