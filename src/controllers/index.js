class SalesForceOrg {
  async getsalesforce(req, res) {
    console.log('in the get request body',req)
    res.status(200).json({ message: "get all users" });
  }
  async postsalesforce(req,res){
    console.log('in the post request body',req);
    console.log(req.body)
    res.status(200).json({ message: "user created" })
  }
}

module.exports = new SalesForceOrg();
