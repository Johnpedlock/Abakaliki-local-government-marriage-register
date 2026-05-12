# Production Ready `server.js`

```js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const pool = require("./db");
const transporter = require("./mailer");

const app = express();

// ======================================================
// TRUST PROXY (RENDER)
// ======================================================
app.set("trust proxy", 1);

// ======================================================
// SECURITY
// ======================================================
app.use(helmet());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ======================================================
// RATE LIMITER
// ======================================================
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
      success: false,
      message: "Too many requests. Please try again later."
    }
  })
);

// ======================================================
// BODY PARSER
// ======================================================
app.use(express.json({ limit: "10mb" }));

// ======================================================
// STATIC ASSETS
// ======================================================
app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"))
);

// ======================================================
// CONFIG
// ======================================================
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET;

// ======================================================
// GENERATE REFERENCE NUMBER
// ======================================================
function generateRef() {
  return `ALMR-EBONYI-${new Date().getFullYear()}-${Math.floor(
    100000 + Math.random() * 900000
  )}`;
}

// ======================================================
// GOVERNMENT LOGO
// ======================================================
function getLogoUrl() {
  return "cid:governmentlogo";
}

// ======================================================
// EMAIL ATTACHMENTS
// ======================================================
function emailAttachments() {
  return [
    {
      filename: "logo.png",
      path: path.join(__dirname, "assets/logo.png"),
      cid: "governmentlogo"
    }
  ];
}

// ======================================================
// GOVERNMENT EMAIL HEADER
// ======================================================
function emailHeader(title) {

  const logoUrl = getLogoUrl();

  return `
  <div style="
    background:#006400;
    color:white;
    padding:28px;
  ">

    <table width="100%" cellspacing="0" cellpadding="0">

      <tr>

        <td width="95" valign="middle">

          <img
            src="${logoUrl}"
            width="72"
            style="
              background:white;
              padding:6px;
              border-radius:10px;
              display:block;
            "
          />

        </td>

        <td valign="middle">

          <h1 style="
            margin:0;
            font-size:30px;
            font-weight:bold;
            letter-spacing:0.5px;
          ">
            Abakaliki Local Government
          </h1>

          <p style="
            margin-top:8px;
            font-size:16px;
          ">
            Marriage Registration Department
          </p>

          <p style="
            margin-top:6px;
            font-size:13px;
            opacity:0.92;
          ">
            Official Government Communication
          </p>

          <p style="
            margin-top:8px;
            font-size:15px;
            font-weight:bold;
          ">
            ${title}
          </p>

        </td>

      </tr>

    </table>

  </div>
  `;
}

// ======================================================
// GOVERNMENT EMAIL FOOTER
// ======================================================
function emailFooter() {

  return `
  <div style="
    background:#f1f1f1;
    padding:28px;
    border-top:1px solid #ddd;
    color:#555;
    font-size:13px;
  ">

    <table width="100%">

      <tr>

        <td>

          <strong>
            Abakaliki Local Government
          </strong><br/>

          Marriage Registration Department<br/>

          Ebonyi State, Nigeria

        </td>

        <td align="right">

          Official Government Notice

        </td>

      </tr>

    </table>

  </div>
  `;
}

// ======================================================
// EMAIL TEMPLATE
// ======================================================
function emailTemplate(title, body) {

  return `
  <div style="
    font-family:Arial,sans-serif;
    background:#eef2f1;
    padding:40px;
  ">

    <div style="
      max-width:780px;
      margin:auto;
      background:white;
      border-radius:14px;
      overflow:hidden;
      border:1px solid #d7d7d7;
      box-shadow:0 2px 14px rgba(0,0,0,0.08);
    ">

      ${emailHeader(title)}

      <div style="
        padding:40px;
        line-height:1.9;
        color:#222;
        font-size:15px;
      ">

        ${body}

      </div>

      ${emailFooter()}

    </div>

  </div>
  `;
}

// ======================================================
// STATUS BADGE
// ======================================================
function statusBadge(text, bg, color) {

  return `
  <span style="
    background:${bg};
    color:${color};
    padding:8px 16px;
    border-radius:22px;
    font-size:12px;
    font-weight:bold;
    letter-spacing:0.6px;
    display:inline-block;
  ">
    ${text}
  </span>
  `;
}

// ======================================================
// ADMIN AUTH
// ======================================================
function auth(req, res, next) {

  const token = req.headers.authorization;

  if (!token) {

    return res.status(403).json({
      success: false,
      message: "No authorization token provided"
    });

  }

  try {

    jwt.verify(token, SECRET);

    next();

  } catch {

    return res.status(403).json({
      success: false,
      message: "Invalid authorization token"
    });

  }
}

// ======================================================
// ROOT
// ======================================================
app.get("/", (req, res) => {

  res.json({
    success: true,
    system: "Abakaliki Marriage Register",
    version: "8.0.0",
    status: "Running",
    environment: "production"
  });

});

// ======================================================
// REGISTER
// ======================================================
app.post("/register", async (req, res) => {

  try {

    const {
      full_name,
      age,
      occupation,
      address,
      phone,
      email,
      condition,
      consent_name,
      wedding_date
    } = req.body;

    if (!full_name || !age || !email) {

      return res.status(400).json({
        success: false,
        message:
          "Full name, age and email are required"
      });

    }

    const ref = generateRef();

    await pool.query(
      `
      INSERT INTO registrations
      (
        id,
        reference_number,
        full_name,
        age,
        occupation,
        address,
        phone,
        email,
        condition,
        consent_name,
        wedding_date,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      `,
      [
        uuidv4(),
        ref,
        full_name,
        age,
        occupation || null,
        address || null,
        phone || null,
        email,
        condition || null,
        consent_name || null,
        wedding_date || null,
        "pending"
      ]
    );

    await transporter.sendMail({

      from:
        '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

      to: email,

      subject:
        "Marriage Registration Submitted Successfully",

      attachments: emailAttachments(),

      html: emailTemplate(
        "Official Registration Notification",
        `
        <h2 style="color:#006400;">
          Marriage Registration Submitted Successfully
        </h2>

        <p>
          Dear ${full_name},
        </p>

        <p>
          Your marriage registration application has been received successfully.
        </p>

        <div style="
          background:#f8f8f8;
          padding:24px;
          border-left:5px solid #006400;
          margin:30px 0;
          border-radius:8px;
        ">

          <p>
            <strong>Reference Number:</strong><br/>
            ${ref}
          </p>

          <p style="margin-top:16px;">
            <strong>Application Status:</strong><br/>
            ${statusBadge(
              "PENDING REVIEW",
              "#fff3cd",
              "#856404"
            )}
          </p>

        </div>

        <p>
          Kindly keep your reference number safe.
        </p>
        `
      )

    });

    res.json({
      success: true,
      message:
        "Registration submitted successfully",
      reference_number: ref,
      status: "pending"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });

  }

});

// ======================================================
// VERIFY REGISTRATION
// ======================================================
app.get("/verify/:ref", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM registrations
      WHERE reference_number=$1
      `,
      [req.params.ref]
    );

    if (!result.rows.length) {

      return res.status(404).json({
        success: false,
        message: "Record not found"
      });

    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Verification failed"
    });

  }

});

// ======================================================
// ADMIN LOGIN
// ======================================================
app.post("/admin/login", async (req, res) => {

  try {

    const adminUser = {
      username: process.env.ADMIN_USERNAME,
      password: bcrypt.hashSync(
        process.env.ADMIN_PASSWORD,
        10
      )
    };

    const { username, password } = req.body;

    if (
      username !== adminUser.username ||
      !bcrypt.compareSync(password, adminUser.password)
    ) {

      return res.status(401).json({
        success: false,
        message: "Invalid login credentials"
      });

    }

    const token = jwt.sign(
      { role: "admin" },
      SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      token
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Login failed"
    });

  }

});

// ======================================================
// ADMIN REGISTRATIONS
// ======================================================
app.get(
  "/admin/registrations",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT *
        FROM registrations
        ORDER BY created_at DESC
        `
      );

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch registrations"
      });

    }

  }
);

// ======================================================
// QR GENERATION
// ======================================================
app.get("/qr/:ref", async (req, res) => {

  try {

    const url =
      `${req.protocol}://${req.get("host")}/verify/${req.params.ref}`;

    const qr = await QRCode.toDataURL(url);

    res.json({
      success: true,
      qr
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message:
        "QR generation failed"
    });

  }

});

// ======================================================
// SERVER
// ======================================================
app.listen(PORT, () => {

  console.log(
    `Abakaliki Marriage Backend running on port ${PORT}`
  );

});


