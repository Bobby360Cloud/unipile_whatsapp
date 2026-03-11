import { getSessionFromValidOrgUser } from '../helpers/validator';

export const validateRequest = async (req, res, next) => {
  const orgId = req?.body?.orgid || req?.query?.orgid;
  const userId = req?.body?.userid || req?.query?.userid;
  const { isValidOrgUser, sessionId, userExits, loggedIn } =
    await getSessionFromValidOrgUser(orgId, userId);
  if (!isValidOrgUser) {
    res.json({
      status: 400,
      message: "Please provide a valid Organisation Id or User Id",
    });
    return;
  }
  if (!loggedIn) return res.json({ status: 400, message: "Inative Session" });
  req.body.sessionId = sessionId;
  // req.body.userExits = userExits;
  // req.body.orgId = orgId;
  // req.body.userId = userId;

  req.body.sessionId = sessionId;
  next();
};