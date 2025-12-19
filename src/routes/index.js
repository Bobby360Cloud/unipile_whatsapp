import { Router } from "express";
import SalesForceOrg from '../controllers/index'


/**
 * Contains all API routes for the application.
 */

const router = Router();

// router.get('/', function (req, res, next) {
//   res.render('index', { title: 'Express' });
// });
// // For Get one User
// router.get('/user/:id',(req, res)=>{
//   let id=req.params.id;
//   res.status(200).json({message:`get user id ${id}`})
// })



//For Get All Users
router.get("/call", SalesForceOrg.getsalesforce);

//For Create User
router.post("/call", SalesForceOrg.postsalesforce );


// router.get("/", (req, res) => {
//     res.redirect('/signup');
// });
// router.get("/signup", (req, res) => {
//     res.render('signup');
// });


// router.post('/signup', async (req, res) => {
//     try {
//       const token = process.env.GEN_TOKEN;
  
//       // Step 2: Create Account
//       const accountResponse = await axios.post(
//         'https://messaginghub.solutions/chatbird/tsp/usermqmt/createAccount',
//         {
//           userName: req.body.username,
//           mobileno: req.body.mobile,
//           email: req.body.email
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );
  
//       const userApiKey = accountResponse.data.api_key;
  
//       // Step 3: Allocate Resource
//       const resourceResponse = await axios.post(
//         'https://messaginghub.solutions/chatbird/tsp/usermqmt/allocateResource',
//         {
//           tolUsername: req.body.username,
//           waba_id: process.env.WABA_ID,
//           phone_display_id: process.env.PHONE_DISPLAY_ID,
//           sender_id: req.body.mobile,
//           display_name: req.body.displayName,
//           webhook: {
//             MO: {
//               url: process.env.MO_WEBHOOK_URL,
//               httpHeaders: "content-type=application/json&charset=UTF-8"
//             },
//             DLR: {
//               url: process.env.DLR_WEBHOOK_URL,
//               httpHeaders: "content-type=application/json&charset=UTF-8",
//               eventCategory: ["Sent", "Delivered", "Read", "Failed"]
//             }
//           }
//         },
//         {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );
  
//       const messagingEndpoint = resourceResponse.data.messagingEndpoint;
  
//       // Render success page with user details
//       res.render('success', {
//         username: req.body.username,
//         email: req.body.email,
//         mobile: req.body.mobile,
//         apiKey: userApiKey,
//         messagingEndpoint: messagingEndpoint
//       });
  
//     } catch (error) {
//       console.error('Error during signup:', error.response?.data || error.message);
//       res.status(500).send('Error during signup process. Please try again.');
//     }
//   });

// //For Delete User
// router.delete('/user/:id', (req, res) => {
//   res.status(200).json({message:`delete user id ${req.params.id}`})
// })

// //For update user
// router.put('/user/:id', (req, res) => {
//   res.status(200).json({message:`update user id ${req.params.id}`})
// })
module.exports = router;
