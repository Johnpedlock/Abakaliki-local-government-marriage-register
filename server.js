require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const path = require("path");

const pool = require("./db");
const transporter = require("./mailer");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.use(
  "/assets",
  express.static(path.join(__dirname, "assets"))
);

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
// GOVERNMENT LOGO URL
// ======================================================
function getLogoUrl(req) {

  return `${req.protocol}://${req.get("host")}/assets/logo.png`;

}

// ======================================================
// GOVERNMENT EMAIL HEADER
// ======================================================
function emailHeader(req, title) {

  const logoUrl = getLogoUrl(req);

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
function emailTemplate(req, title, body) {

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

      ${emailHeader(req, title)}

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
    version: "7.0.0",
    status: "Running"
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

    // ======================================================
    // USER REGISTRATION EMAIL
    // ======================================================
    await transporter.sendMail({

      from:
        '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

      to: email,

      subject:
        "Marriage Registration Submitted Successfully",

      html: emailTemplate(
        req,
        "Official Registration Notification",
        `
        <h2 style="color:#006400;">
          Marriage Registration Submitted Successfully
        </h2>

        <p>
          Dear ${full_name},
        </p>

        <p>
          This is to officially acknowledge receipt of your marriage registration application submitted through the Abakaliki Local Government Marriage Registration Portal.
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
          Your application is currently undergoing administrative verification and official review.
        </p>

        <p>
          Once approved, another official government notification will be sent containing further instructions regarding certificate processing and appointment scheduling.
        </p>

        <p>
          Kindly keep your reference number safe for future verification and correspondence.
        </p>

        <br/>

        <p>
          Thank you for using the official Abakaliki Marriage Registration Portal.
        </p>
        `
      )

    });

    // ======================================================
    // ADMIN REGISTRATION ALERT
    // ======================================================
    await transporter.sendMail({

      from:
        '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

      to: process.env.ADMIN_EMAILS.split(","),

      subject:
        "New Marriage Registration Submitted",

      html: emailTemplate(
        req,
        "Administrative Registration Alert",
        `
        <h2 style="color:#006400;">
          New Marriage Registration Submitted
        </h2>

        <p>
          A new marriage registration application has been submitted through the official government portal.
        </p>

        <div style="
          background:#f8f8f8;
          padding:24px;
          border-left:5px solid #006400;
          margin:30px 0;
          border-radius:8px;
        ">

          <p>
            <strong>Applicant Name:</strong><br/>
            ${full_name}
          </p>

          <p>
            <strong>Reference Number:</strong><br/>
            ${ref}
          </p>

          <p>
            <strong>Email Address:</strong><br/>
            ${email}
          </p>

          <p>
            <strong>Phone Number:</strong><br/>
            ${phone || "-"}
          </p>

          <p>
            <strong>Occupation:</strong><br/>
            ${occupation || "-"}
          </p>

          <p>
            <strong>Wedding Date:</strong><br/>
            ${wedding_date || "-"}
          </p>

        </div>

        <div style="
          background:#fff8e1;
          padding:18px;
          border-radius:8px;
          border:1px solid #f0d879;
        ">

          <strong>
            Administrative Action Required
          </strong>

          <p style="margin-top:10px;">
            Kindly login to the Administrative Dashboard to review and process this registration application.
          </p>

        </div>
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
      username: "admin",
      password: bcrypt.hashSync("admin123", 10)
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
// APPROVE REGISTRATION
// ======================================================
app.put(
  "/admin/verify/:ref",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        UPDATE registrations
        SET status='verified'
        WHERE reference_number=$1
        RETURNING *
        `,
        [req.params.ref]
      );

      if (!result.rows.length) {

        return res.status(404).json({
          success: false,
          message:
            "Registration not found"
        });

      }

      const applicant = result.rows[0];

      // ======================================================
      // APPROVAL EMAIL
      // ======================================================
      await transporter.sendMail({

        from:
          '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

        to: applicant.email,

        subject:
          "Marriage Registration Approved",

        html: emailTemplate(
          req,
          "Registration Approval Notice",
          `
          <h2 style="color:#006400;">
            Registration Approved Successfully
          </h2>

          <p>
            Dear ${applicant.full_name},
          </p>

          <p>
            We are pleased to inform you that your marriage registration application has been approved successfully.
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
              ${applicant.reference_number}
            </p>

            <p style="margin-top:16px;">
              <strong>Status:</strong><br/>
              ${statusBadge(
                "APPROVED",
                "#d4edda",
                "#155724"
              )}
            </p>

          </div>

          <p>
            You may now proceed for appointment scheduling and certificate processing.
          </p>
          `
        )

      });

      res.json({
        success: true,
        message:
          "Registration approved successfully"
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message:
          "Approval process failed"
      });

    }

  }
);

// ======================================================
// COLLECT CERTIFICATE
// ======================================================
app.put(
  "/admin/collect/:ref",
  auth,
  async (req, res) => {

    try {

      await pool.query(
        `
        UPDATE registrations
        SET
          status='collected',
          collected_at=NOW()
        WHERE reference_number=$1
        `,
        [req.params.ref]
      );

      res.json({
        success: true,
        message:
          "Certificate collection recorded"
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message:
          "Collection update failed"
      });

    }

  }
);

// ======================================================
// AVAILABLE APPOINTMENT SLOTS
// ======================================================
app.get(
  "/appointments/available",
  async (req, res) => {

    try {

      const { date } = req.query;

      if (!date) {

        return res.status(400).json({
          success: false,
          message: "Date is required"
        });

      }

      const allSlots = [
        "09:00 AM",
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "01:00 PM",
        "02:00 PM",
        "03:00 PM"
      ];

      const result = await pool.query(
        `
        SELECT appointment_time
        FROM appointments
        WHERE appointment_date=$1
        `,
        [date]
      );

      const booked = result.rows.map(
        row => row.appointment_time
      );

      const available = allSlots.filter(
        slot => !booked.includes(slot)
      );

      res.json({
        success: true,
        date,
        available_slots: available
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch appointment slots"
      });

    }

  }
);

// ======================================================
// BOOK APPOINTMENT
// ======================================================
app.post("/appointments", async (req, res) => {

  try {

    const {
      full_name,
      email,
      phone,
      appointment_date,
      appointment_time,
      registration_ref
    } = req.body;

    if (
      !full_name ||
      !email ||
      !appointment_date ||
      !appointment_time
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Required appointment fields are missing"
      });

    }

    // ======================================================
    // VERIFY REGISTRATION REFERENCE
    // ======================================================
    if (registration_ref) {

      const registrationCheck = await pool.query(
        `
        SELECT *
        FROM registrations
        WHERE reference_number=$1
        `,
        [registration_ref]
      );

      if (!registrationCheck.rows.length) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid registration reference number"
        });

      }

    }

    // ======================================================
    // SLOT VALIDATION
    // ======================================================
    const existing = await pool.query(
      `
      SELECT *
      FROM appointments
      WHERE appointment_date=$1
      AND appointment_time=$2
      `,
      [appointment_date, appointment_time]
    );

    if (existing.rows.length > 0) {

      return res.status(400).json({
        success: false,
        message:
          "This appointment slot is already booked"
      });

    }

    const ref = generateRef();

    // ======================================================
    // SAVE APPOINTMENT
    // ======================================================
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
        ref,
        full_name,
        email,
        phone || null,
        appointment_date,
        appointment_time,
        registration_ref || null,
        "pending"
      ]
    );

    const verifyUrl =
      `${req.protocol}://${req.get("host")}/verify/${ref}`;

    const qr = await QRCode.toDataURL(verifyUrl);

    // ======================================================
    // USER APPOINTMENT EMAIL
    // ======================================================
    await transporter.sendMail({

      from:
        '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

      to: email,

      subject:
        "Appointment Booking Confirmation",

      html: emailTemplate(
        req,
        "Official Appointment Confirmation",
        `
        <h2 style="color:#006400;">
          Appointment Scheduled Successfully
        </h2>

        <p>
          Dear ${full_name},
        </p>

        <p>
          Your appointment has been scheduled successfully with the Abakaliki Local Government Marriage Registration Department.
        </p>

        <div style="
          background:#f8f8f8;
          padding:24px;
          border-left:5px solid #006400;
          margin:30px 0;
          border-radius:8px;
        ">

          <p>
            <strong>Appointment Reference:</strong><br/>
            ${ref}
          </p>

          <p>
            <strong>Appointment Date:</strong><br/>
            ${appointment_date}
          </p>

          <p>
            <strong>Appointment Time:</strong><br/>
            ${appointment_time}
          </p>

          <p style="margin-top:16px;">
            <strong>Status:</strong><br/>
            ${statusBadge(
              "BOOKED",
              "#d4edda",
              "#155724"
            )}
          </p>

        </div>

        <div style="
          text-align:center;
          margin:35px 0;
          padding:25px;
          background:#fafafa;
          border:1px solid #ddd;
          border-radius:10px;
        ">

          <p style="
            font-weight:bold;
            margin-bottom:20px;
          ">
            Official Verification QR Code
          </p>

          <img src="${qr}" width="220" />

        </div>

        <p>
          Kindly arrive with your QR code, reference number and supporting documents.
        </p>

        <p>
          Please arrive at least 15 minutes before your appointment time.
        </p>
        `
      )

    });

    // ======================================================
    // ADMIN APPOINTMENT ALERT
    // ======================================================
    await transporter.sendMail({

      from:
        '"Abakaliki Marriage Register" <marriageregistryabakalikilocal@gmail.com>',

      to: process.env.ADMIN_EMAILS.split(","),

      subject:
        "New Appointment Booking",

      html: emailTemplate(
        req,
        "Administrative Appointment Alert",
        `
        <h2 style="color:#006400;">
          New Appointment Booking
        </h2>

        <p>
          A new appointment has been scheduled through the official government portal.
        </p>

        <div style="
          background:#f8f8f8;
          padding:24px;
          border-left:5px solid #006400;
          margin:30px 0;
          border-radius:8px;
        ">

          <p>
            <strong>Applicant Name:</strong><br/>
            ${full_name}
          </p>

          <p>
            <strong>Appointment Reference:</strong><br/>
            ${ref}
          </p>

          <p>
            <strong>Email Address:</strong><br/>
            ${email}
          </p>

          <p>
            <strong>Phone Number:</strong><br/>
            ${phone || "-"}
          </p>

          <p>
            <strong>Appointment Date:</strong><br/>
            ${appointment_date}
          </p>

          <p>
            <strong>Appointment Time:</strong><br/>
            ${appointment_time}
          </p>

        </div>
        `
      )

    });

    res.json({
      success: true,
      message:
        "Appointment booked successfully",
      reference_number: ref,
      verification_url: verifyUrl,
      qr_code: qr,
      status: "pending"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message:
        "Appointment booking failed"
    });

  }

});

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
        ORDER BY appointment_date ASC
        `
      );

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch appointments"
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
// VERIFY QR
// ======================================================
app.put(
  "/appointments/verify/:ref",
  auth,
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        UPDATE appointments
        SET
          qr_verified=true,
          verified_at=NOW(),
          status='completed'
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

      res.json({
        success: true,
        message:
          "QR verified successfully",
        appointment: result.rows[0]
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        success: false,
        message:
          "QR verification failed"
      });

    }

  }
);

// ======================================================
// START SERVER
// ======================================================
app.listen(PORT, () => {

  console.log(
    `Server running on http://localhost:${PORT}`
  );

});
