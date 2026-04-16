const { SignJWT } = require('jose');
const crypto = require('crypto');
async function run() {
  try {
    const s = "03E943D4-1731-4700-B89B-E69BE2213D00";
    const secret = new TextEncoder().encode(s);
    const token = await new SignJWT({ test: 'hello' }).setProtectedHeader({ alg: 'HS256' }).sign(secret);
    console.log("Success U8", token);
  } catch(e) {
    console.log("Failed U8", e.message);
  }
}
run();
