const crypto = require('crypto');
try {
  crypto.createHmac('sha256', '03E943D4-1731-4700-B89B-E69BE2213D00');
  console.log("Success HMAC");
} catch(e) {
  console.log("Error HMAC", e.message);
}
