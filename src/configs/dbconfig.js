import mongoose from "mongoose";




const dbConnect=async()=>{
// 127.0.0.1
mongoose.connect("mongodb://127.0.0.1:27017/unipile_whatsapp", { useNewUrlParser: true, useUnifiedTopology: true }).then(async () => {
     console.log("connection successfull....")
  }
  ).catch((err) => console.log("err in connecting", err));
}

export default dbConnect;