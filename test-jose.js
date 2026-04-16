const { SignJWT } = require('jose');

async function run() {
  try {
    const secret = new TextEncoder().encode("something");
    const token = await new SignJWT({ test: 'hello' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
    console.log("Success", token);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
