
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

// ==========================================
// CORS CONFIGURATION
// ==========================================

app.use(
  cors({
    origin: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    credentials: true
  })
);

// ==========================================
// RATE LIMITERS
// ==========================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message:
      "Too many login attempts. Please try again later."
  }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message:
      "Too many registration attempts. Please try again later."
  }
});

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message:
      "Too many tracking requests. Please try again later."
  }
});

// ======================================================
// TRUST PROXY (RENDER)
// ======================================================
app.set("trust proxy", 1);

// ======================================================
// SECURITY
// ======================================================
app.use(helmet());



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
app.post("/register", registerLimiter, async (req, res) => {

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

    // ==========================================
    // INPUT VALIDATION
    // ==========================================

    if (
      !full_name ||
      !age ||
      !phone ||
      !email ||
      !wedding_date
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Required fields are missing"
      });

    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid email address"
      });

    }

    const phoneRegex =
      /^[0-9]{11}$/;

    if (!phoneRegex.test(phone)) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid phone number"
      });

    }

    if (Number(age) < 18) {

      return res.status(400).json({
        success: false,
        message:
          "Applicant must be at least 18 years old"
      });

    }

    // ==========================================
    // DUPLICATE REGISTRATION CHECK
    // ==========================================

    const existingRegistration =
      await pool.query(
        `
        SELECT *
        FROM registrations
        WHERE email=$1
        OR phone=$2
        `,
        [email, phone]
      );

    if (existingRegistration.rows.length) {

      return res.status(400).json({
        success: false,
        message:
          "A registration already exists with this email or phone number"
      });

    }

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
app.post("/admin/login", loginLimiter, async (req, res) => {

  try {

    const { username, password } = req.body;

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
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
// ADMIN APPOINTMENTS
// ======================================================
app.get(
  "/admin/appointments",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT *
        FROM appointments
        ORDER BY created_at DESC
        `
      );

      res.json({
        success: true,
        appointments: result.rows
      });

    } catch (err) {

      console.error(
        "ADMIN APPOINTMENTS ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch appointments"
      });

    }

  }
);



// ======================================================
// APPROVE APPOINTMENT
// ======================================================
app.put(
  "/admin/appointment/:ref/approve",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        UPDATE appointments
        SET status='approved'
        WHERE reference_number=$1
        RETURNING *
        `,
        [req.params.ref]
      );

      if (!result.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Appointment not found"
        });

      }

      const appointment =
        result.rows[0];

      console.log(
        "APPOINTMENT APPROVED:",
        appointment.reference_number
      );

      // ==========================================
      // AUDIT LOG
      // ==========================================
      await pool.query(
        `
        INSERT INTO audit_logs (
          id,
          action,
          appointment_reference,
          admin_role,
          details
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          uuidv4(),
          'APPOINTMENT_APPROVED',
          appointment.reference_number,
          'admin',
          'Appointment approved successfully'
        ]
      );

      res.json({
        success: true,
        message:
          "Appointment approved successfully",
        appointment
      });

    } catch (err) {

      console.error(
        "APPROVE APPOINTMENT ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to approve appointment"
      });

    }

  }
);



// ======================================================
// COMPLETE APPOINTMENT
// ======================================================
app.put(
  "/admin/appointment/:ref/complete",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        UPDATE appointments
        SET status='completed'
        WHERE reference_number=$1
        RETURNING *
        `,
        [req.params.ref]
      );

      if (!result.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Appointment not found"
        });

      }

      const appointment =
        result.rows[0];

      console.log(
        "APPOINTMENT COMPLETED:",
        appointment.reference_number
      );

      res.json({
        success: true,
        message:
          "Appointment completed successfully",
        appointment
      });

    } catch (err) {

      console.error(
        "COMPLETE APPOINTMENT ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to complete appointment"
      });

    }

  }
);



// ======================================================
// REJECT APPOINTMENT
// ======================================================
app.put(
  "/admin/appointment/:ref/reject",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        UPDATE appointments
        SET status='rejected'
        WHERE reference_number=$1
        RETURNING *
        `,
        [req.params.ref]
      );

      if (!result.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Appointment not found"
        });

      }

      const appointment =
        result.rows[0];

      console.log(
        "APPOINTMENT REJECTED:",
        appointment.reference_number
      );

      res.json({
        success: true,
        message:
          "Appointment rejected successfully",
        appointment
      });

    } catch (err) {

      console.error(
        "REJECT APPOINTMENT ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to reject appointment"
      });

    }

  }
);



// ======================================================
// RESCHEDULE APPOINTMENT
// ======================================================
app.put(
  "/admin/appointment/:ref/reschedule",
  auth,
  async (req, res) => {

    try {

      const {
        appointment_date,
        appointment_time
      } = req.body;

      // ==========================================
      // APPOINTMENT VALIDATION
      // ==========================================

      if (
        !registration_ref ||
        !appointment_date ||
        !appointment_time
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Required appointment fields are missing"
        });

      }

      const selectedDate =
        new Date(appointment_date);

      const today =
        new Date();

      today.setHours(0,0,0,0);

      if (selectedDate < today) {

        return res.status(400).json({
          success: false,
          message:
            "Appointment date cannot be in the past"
        });

      }

      const result = await pool.query(
        `
        UPDATE appointments
        SET
          appointment_date=$1,
          appointment_time=$2,
          status='rescheduled'
        WHERE reference_number=$3
        RETURNING *
        `,
        [
          appointment_date,
          appointment_time,
          req.params.ref
        ]
      );

      if (!result.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Appointment not found"
        });

      }

      const appointment =
        result.rows[0];

      console.log(
        "APPOINTMENT RESCHEDULED:",
        appointment.reference_number
      );

      res.json({
        success: true,
        message:
          "Appointment rescheduled successfully",
        appointment
      });

    } catch (err) {

      console.error(
        "RESCHEDULE APPOINTMENT ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to reschedule appointment"
      });

    }

  }
);



// ======================================================
// ======================================================
// APPROVE REGISTRATION
// ======================================================
app.put(
  "/admin/registration/:ref/approve",
  auth,
  async (req, res) => {

    try {

      const ref = req.params.ref;

      const registration =
        await pool.query(
          `
          UPDATE registrations
          SET status='approved'
          WHERE reference_number=$1
          RETURNING *
          `,
          [ref]
        );

      if (!registration.rows.length) {

        return res.status(404).json({
          success: false,
          message: "Registration not found"
        });

      }

      const applicant =
        registration.rows[0];

      // ======================================================
      // SEND APPROVAL EMAIL
      // ======================================================
      try {

        await transporter.sendMail({

          to: applicant.email,

          subject:
            "Marriage Registration Approved",

          html: emailTemplate(
            "Registration Approved",
            `
            <h2 style="
              color:#006400;
            ">
              Registration Approved
            </h2>

            <p>
              Dear
              <strong>
                ${applicant.full_name}
              </strong>,
            </p>

            <p>
              Your marriage registration has been approved successfully.
            </p>

            <div style="
              background:#f8f8f8;
              border-left:5px solid #006400;
              padding:20px;
              border-radius:10px;
              margin:20px 0;
            ">

              <p>
                <strong>
                  Reference Number:
                </strong>
              </p>

              <h2 style="
                color:#006400;
              ">
                ${ref}
              </h2>

            </div>

            <p>
              You may now proceed with appointment scheduling through the official portal.
            </p>
            `
          )

        });

      } catch (mailError) {

        console.error(
          "APPROVAL EMAIL ERROR:",
          mailError
        );

      }

      res.json({
        success: true,
        message:
          "Registration approved successfully",
        registration:
          registration.rows[0]
      });

    } catch (err) {

      console.error(
        "REGISTRATION APPROVAL ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Approval failed"
      });

    }

  }
);

// ======================================================
// REJECT REGISTRATION
// ======================================================
app.put(
  "/admin/registration/:ref/reject",
  auth,
  async (req, res) => {

    try {

      const ref = req.params.ref;

      const registration =
        await pool.query(
          `
          UPDATE registrations
          SET status='rejected'
          WHERE reference_number=$1
          RETURNING *
          `,
          [ref]
        );

      if (!registration.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Registration not found"
        });

      }

      const applicant =
        registration.rows[0];

      // ======================================================
      // SEND REJECTION EMAIL
      // ======================================================
      try {

        await transporter.sendMail({

          to: applicant.email,

          subject:
            "Marriage Registration Rejected",

          html: emailTemplate(
            "Registration Rejected",
            `
            <h2 style="
              color:#8B0000;
            ">
              Registration Rejected
            </h2>

            <p>
              Dear
              <strong>
                ${applicant.full_name}
              </strong>,
            </p>

            <p>
              We regret to inform you that your marriage registration was not approved after administrative review.
            </p>

            <div style="
              background:#f8f8f8;
              border-left:5px solid #8B0000;
              padding:20px;
              border-radius:10px;
              margin:20px 0;
            ">

              <p>
                <strong>
                  Reference Number:
                </strong>
              </p>

              <h2 style="
                color:#8B0000;
              ">
                ${ref}
              </h2>

            </div>

            <p>
              Please contact the registry office for further clarification.
            </p>
            `
          )

        });

      } catch (mailError) {

        console.error(
          "REJECTION EMAIL ERROR:",
          mailError
        );

      }

      res.json({
        success: true,
        message:
          "Registration rejected successfully",
        registration:
          registration.rows[0]
      });

    } catch (err) {

      console.error(
        "REGISTRATION REJECTION ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Rejection failed"
      });

    }

  }
);


// ADMIN DASHBOARD STATS
// ======================================================
app.get(
  "/admin/dashboard/stats",
  auth,
  async (req, res) => {

    try {

      const registrations =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM registrations
          `
        );

      const appointments =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM appointments
          `
        );

      const approved =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM appointments
          WHERE status='approved'
          `
        );

      const completed =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM appointments
          WHERE status='completed'
          `
        );

      const rejected =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM appointments
          WHERE status='rejected'
          `
        );

      const rescheduled =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM appointments
          WHERE status='rescheduled'
          `
        );

      const auditLogs =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM audit_logs
          `
        );

      res.json({
        success: true,
        stats: {
          total_registrations:
            registrations.rows[0].total,

          total_appointments:
            appointments.rows[0].total,

          approved_appointments:
            approved.rows[0].total,

          completed_appointments:
            completed.rows[0].total,

          rejected_appointments:
            rejected.rows[0].total,

          rescheduled_appointments:
            rescheduled.rows[0].total,

          
audit_logs:
              auditLogs.rows[0].total

        }
      });

    } catch (err) {

      console.error(
        "DASHBOARD STATS ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load dashboard statistics"
      });

    }

  }
);



// ======================================================
// PUBLIC TRACKING
// ======================================================
app.get(
  "/track/:reference",
  trackingLimiter,
  async (req, res) => {

    try {

      const registration =
        await pool.query(
          `
          SELECT *
          FROM registrations
          WHERE reference_number=$1
          `,
          [req.params.reference]
        );

      if (!registration.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Registration not found"
        });

      }

      const appointment =
        await pool.query(
          `
          SELECT *
          FROM appointments
          WHERE registration_ref=$1
          ORDER BY created_at DESC
          LIMIT 1
          `,
          [req.params.reference]
        );

      res.json({
        success: true,

        registration:
          registration.rows[0],

        appointment:
          appointment.rows.length
            ? appointment.rows[0]
            : null
      });

    } catch (err) {

      console.error(
        "TRACKING ERROR:",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Tracking lookup failed"
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
// CREATE APPOINTMENT
// ======================================================
app.post("/appointment/create", auth, async (req, res) => {

  try {

    const {
      registration_ref,
      appointment_date,
      appointment_time
    } = req.body;

    // ==========================================
    // VALIDATE REGISTRATION
    // ==========================================
    const registration = await pool.query(
      `
      SELECT *
      FROM registrations
      WHERE reference_number=$1
      `,
      [registration_ref]
    );

    if (!registration.rows.length) {

      return res.status(404).json({
        success: false,
        message: "Registration not found"
      });

    }

    
const applicant = registration.rows[0];

      // ==========================================
      // DUPLICATE APPOINTMENT CHECK
      // ==========================================

      const existingAppointment =
        await pool.query(
          `
          SELECT *
          FROM appointments
          WHERE registration_ref=$1
          AND status IN (
            'scheduled',
            'approved',
            'rescheduled'
          )
          `,
          [registration_ref]
        );

      if (existingAppointment.rows.length) {

        return res.status(400).json({
          success: false,
          message:
            "An active appointment already exists for this registration"
        });

      }


    // ==========================================
    // GENERATE APPOINTMENT REFERENCE
    // ==========================================
    const appointmentRef =
      `APT-${Date.now()}`;

    // ==========================================
    // INSERT APPOINTMENT
    // ==========================================
    await pool.query(
      `
      INSERT INTO appointments
      (
        id,
        reference_number,
        full_name,
        email,
        phone,
        appointment_date,
        appointment_time,
        registration_ref,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      `,
      [
        uuidv4(),
        appointmentRef,
        applicant.full_name,
        applicant.email,
        applicant.phone,
        appointment_date,
        appointment_time,
        registration_ref,
        "scheduled"
      ]
    );

    // ==========================================
    // GENERATE QR
    // ==========================================
    const qrUrl =
      `${req.protocol}://${req.get("host")}/verify/${registration_ref}`;

    const qr =
      await QRCode.toDataURL(qrUrl);

    // ==========================================
    // APPLICANT EMAIL
    // ==========================================
    await transporter.sendMail({

      to: applicant.email,

      subject:
        "Marriage Appointment Scheduled",

      html: emailTemplate(
        "Marriage Appointment Scheduled",
        `
        <h2 style="color:#006400;">
          Appointment Scheduled Successfully
        </h2>

        <p>
          Dear <strong>${applicant.full_name}</strong>,
        </p>

        <p>
          Your marriage appointment has been scheduled successfully.
        </p>

        <div style="
          background:#f8f8f8;
          border-left:5px solid #006400;
          padding:24px;
          border-radius:12px;
          margin:30px 0;
        ">

          <p>
            <strong>Appointment Reference:</strong><br/>
            ${appointmentRef}
          </p>

          <p>
            <strong>Date:</strong><br/>
            ${appointment_date}
          </p>

          <p>
            <strong>Time:</strong><br/>
            ${appointment_time}
          </p>

        </div>

        <p>
          Kindly arrive early for verification.
        </p>

        <img
          src="${qr}"
          width="180"
          style="
            margin-top:20px;
            border:1px solid #ddd;
            padding:10px;
            border-radius:10px;
          "
        />
        `
      )

    });

    // ==========================================
    // ADMIN NOTIFICATION
    // ==========================================
    await transporter.sendMail({

      to: [
        "marriageregistryabakalikilocal@gmail.com",
        "marriageregistrarabakalikilga@gmail.com"
      ],

      subject:
        `New Appointment Scheduled - ${appointmentRef}`,

      html: emailTemplate(
        "Appointment Scheduled",
        `
        <h2 style="color:#006400;">
          New Appointment Scheduled
        </h2>

        <p>
          A marriage appointment has been scheduled.
        </p>

        <div style="
          background:#f8f8f8;
          border-left:5px solid #006400;
          padding:24px;
          border-radius:12px;
          margin:30px 0;
        ">

          <p>
            <strong>Applicant:</strong><br/>
            ${applicant.full_name}
          </p>

          <p>
            <strong>Appointment Reference:</strong><br/>
            ${appointmentRef}
          </p>

          <p>
            <strong>Date:</strong><br/>
            ${appointment_date}
          </p>

          <p>
            <strong>Time:</strong><br/>
            ${appointment_time}
          </p>

        </div>
        `
      )

    });

    console.log(
      "APPOINTMENT CREATED SUCCESSFULLY"
    );

    res.json({
      success: true,
      appointment_reference: appointmentRef,
      qr
    });

  } catch (err) {

    console.error(
      "APPOINTMENT ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Appointment creation failed"
    });

  }

});



// ======================================================
// VERIFY APPOINTMENT
// ======================================================
app.get("/appointment/verify/:ref", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM appointments
      WHERE reference_number=$1
      `,
      [req.params.ref]
    );

    if (!result.rows.length) {

      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });

    }

    const appointment = result.rows[0];

    // ==========================================
    // MARK QR AS VERIFIED
    // ==========================================
    await pool.query(
      `
      UPDATE appointments
      SET
        qr_verified=true,
        verified_at=NOW()
      WHERE reference_number=$1
      `,
      [req.params.ref]
    );

    res.json({
      success: true,
      appointment: {
        reference_number:
          appointment.reference_number,
        full_name:
          appointment.full_name,
        appointment_date:
          appointment.appointment_date,
        appointment_time:
          appointment.appointment_time,
        status:
          appointment.status,
        qr_verified: true
      }
    });

  } catch (err) {

    console.error(
      "APPOINTMENT VERIFY ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Appointment verification failed"
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

