
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
// RESPONSIVE EMAIL TEMPLATE
// ======================================================
function emailTemplate(title, body) {

  return `
  <!DOCTYPE html>
  <html>

  <head>

    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>${title}</title>

  </head>

  <body style="
    margin:0;
    padding:0;
    background:#eef2f1;
    font-family:Arial,sans-serif;
  ">

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="
        padding:20px;
        background:#eef2f1;
      "
    >

      <tr>

        <td align="center">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width:650px;
              background:white;
              border-radius:18px;
              overflow:hidden;
              box-shadow:0 4px 20px rgba(0,0,0,0.08);
            "
          >

            <!-- HEADER -->
            <tr>

              <td
                style="
                  background:#006400;
                  padding:35px 20px;
                  text-align:center;
                "
              >

                <img
                  src="https://abakaliki-marriage-backend.onrender.com/assets/logo.png"
                  alt="Government Logo"
                  width="95"
                  style="
                    display:block;
                    margin:auto;
                    background:white;
                    padding:10px;
                    border-radius:14px;
                  "
                />

                <h1 style="
                  color:white;
                  margin-top:22px;
                  margin-bottom:8px;
                  font-size:28px;
                  line-height:1.4;
                ">
                  Abakaliki Local Government
                </h1>

                <p style="
                  color:white;
                  font-size:15px;
                  margin:0;
                ">
                  Marriage Registration Department
                </p>

              </td>

            </tr>

            <!-- BODY -->
            <tr>

              <td style="
                padding:35px 28px;
                color:#222;
                font-size:15px;
                line-height:1.9;
              ">

                ${body}

              </td>

            </tr>

            <!-- FOOTER -->
            <tr>

              <td style="
                background:#f5f5f5;
                padding:24px;
                text-align:center;
                font-size:13px;
                color:#666;
              ">

                <strong>
                  Abakaliki Local Government
                </strong>

                <br/>

                Ebonyi State, Nigeria

                <br/><br/>

                Official Government Communication

              </td>

            </tr>

          </table>

        </td>

      </tr>

    </table>

  </body>

  </html>
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
    padding:10px 18px;
    border-radius:22px;
    font-size:13px;
    font-weight:bold;
    display:inline-block;
  ">
    ${text}
  </span>
  `;

}

// ======================================================
// ADMIN AUTH MIDDLEWARE
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
    version: "9.0.0",
    status: "Running",
    environment: "production"
  });

});

// ======================================================
// HEALTH CHECK
// ======================================================
app.get("/health", async (req, res) => {

  try {

    await pool.query("SELECT NOW()");

    res.json({
      success: true,
      server: "online",
      database: "connected",
      email_service: "brevo-api",
      uptime: process.uptime()
    });





    res.json({
      success: true,
      server: "online",
      database: "connected",
      email_service: "brevo-api",
      uptime: process.uptime()
    });

  } catch (err) {

    console.error("SERVER ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

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

    // ======================================================
    // VALIDATION
    // ======================================================
    if (!full_name || !age || !email) {

      return res.status(400).json({
        success: false,
        message:
          "Full name, age and email are required"
      });

    }

    // ======================================================
    // GENERATE REFERENCE
    // ======================================================
    const ref = generateRef();

    // ======================================================
    // SAVE TO DATABASE
    // ======================================================
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

    // ======================================================
    // SEND EMAIL
    // ======================================================
    try {

      await transporter.sendMail({

        to: email,

        subject:
          "Marriage Registration Submitted Successfully",

        html: emailTemplate(
          "Marriage Registration Submitted",
          `
          <h2 style="
            color:#006400;
            margin-top:0;
            font-size:26px;
          ">
            Registration Submitted Successfully
          </h2>

          <p>
            Dear <strong>${full_name}</strong>,
          </p>

          <p>
            Your marriage registration application has been received successfully by the Abakaliki Local Government Marriage Registration Department.
          </p>

          <div style="
            background:#f8f8f8;
            border-left:5px solid #006400;
            padding:22px;
            border-radius:12px;
            margin:30px 0;
          ">

            <p style="
              margin:0;
              color:#555;
              font-size:14px;
            ">
              Reference Number
            </p>

            <h2 style="
              color:#006400;
              margin-top:12px;
              margin-bottom:0;
              word-break:break-word;
              font-size:24px;
            ">
              ${ref}
            </h2>

          </div>

          <p>
            Your application status is currently:
          </p>

          <div style="margin-top:12px;">
            ${statusBadge(
              "PENDING REVIEW",
              "#fff3cd",
              "#856404"
            )}
          </div>

          <br/>

          <p>
            Please keep your reference number safe for verification and appointment scheduling.
          </p>

          <p>
            Thank you for using the official marriage registration portal.
          </p>
          `
        )

      });

      console.log("EMAIL SENT SUCCESSFULLY");

    } catch (mailError) {

      console.error("EMAIL ERROR:", mailError);

    }

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================
    // ======================================================
    // ADMIN NOTIFICATION EMAILS
    // ======================================================
    try {

      await transporter.sendMail({

        from:
          '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

        to: [
          "marriageregistryabakalikilocal@gmail.com",
          "marriageregistrarabakalikilga@gmail.com"
        ],

        subject:
          `New Marriage Registration - ${ref}`,

        html: emailTemplate(
          "New Marriage Registration Alert",
          `
          <h2 style="color:#006400;">
            New Marriage Registration Submitted
          </h2>

          <p>
            A new marriage registration application has been submitted through the official portal.
          </p>

          <div style="
            background:#f8f8f8;
            border-left:5px solid #006400;
            padding:24px;
            margin:30px 0;
            border-radius:10px;
          ">

            <p><strong>Reference Number:</strong><br/>${ref}</p>

            <p><strong>Full Name:</strong><br/>${full_name}</p>

            <p><strong>Age:</strong><br/>${age}</p>

            <p><strong>Occupation:</strong><br/>${occupation || "N/A"}</p>

            <p><strong>Address:</strong><br/>${address || "N/A"}</p>

            <p><strong>Phone:</strong><br/>${phone || "N/A"}</p>

            <p><strong>Email:</strong><br/>${email}</p>

            <p><strong>Marital Status:</strong><br/>${condition || "N/A"}</p>

            <p><strong>Consent Name:</strong><br/>${consent_name || "N/A"}</p>

            <p><strong>Wedding Date:</strong><br/>${wedding_date || "N/A"}</p>

          </div>
          `
        )

      });

      console.log(
        "ADMIN NOTIFICATION SENT SUCCESSFULLY"
      );

    } catch (adminMailError) {

      console.error(
        "ADMIN EMAIL ERROR:",
        adminMailError
      );

    }

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================
    res.json({
      success: true,
      message:
        "Registration submitted successfully",
      reference_number: ref,
      status: "pending"
    });

  } catch (err) {

    console.error("SERVER ERROR:", err);

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

    console.error("SERVER ERROR:", err);

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

    console.error("SERVER ERROR:", err);

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

      console.error("SERVER ERROR:", err);

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

    console.error("SERVER ERROR:", err);

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

