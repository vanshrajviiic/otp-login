const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();

// CORS fix for CodeSandbox
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.FAST2SMS_API_KEY;
const otpStore = {};

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10) {
    return res.json({ success: false, message: "Invalid mobile number" });
  }

  const otp = generateOTP();
  otpStore[phone] = { otp, expiry: Date.now() + 5 * 60 * 1000 };

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: otp,
        numbers: phone,
      }),
    });

    const data = await response.json();
    if (data.return) {
      res.json({ success: true, message: "OTP sent!" });
    } else {
      res.json({ success: false, message: "Could not send OTP" });
    }
  } catch (err) {
    res.json({ success: false, message: "Server error" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];

  if (!record)
    return res.json({ success: false, message: "Please send OTP first" });
  if (Date.now() > record.expiry) {
    delete otpStore[phone];
    return res.json({ success: false, message: "OTP expired" });
  }
  if (record.otp !== otp)
    return res.json({ success: false, message: "Wrong OTP" });

  delete otpStore[phone];
  res.json({ success: true, message: "Login successful!" });
});

const PORT = process.env.PORT || 50000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
