// import mongoose from 'mongoose'
// import { DB_NAME } from '../constants.js';

// export const connectDB = async () => {
//     try{
//         const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         console.log(`MongoDB connected ${connectionInstance.connection.host}`);
//     }
//     catch(error){
//         console.log(error);
//         process.exit(1);

//     }
// }

import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log(`MongoDB connected ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};
