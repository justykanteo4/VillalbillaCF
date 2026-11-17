function verifiedClaims(claims){return claims?.email_verified===true||claims?.firebase?.sign_in_provider==='google.com'}
async function verifiedAccount(user){if(!user)return false;if(typeof user.getIdTokenResult==='function')return verifiedClaims((await user.getIdTokenResult(true)).claims);return user.emailVerified===true}
module.exports={verifiedClaims,verifiedAccount};
