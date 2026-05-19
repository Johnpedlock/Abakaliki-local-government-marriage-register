from pathlib import Path

server = Path("server.js")

content = server.read_text()

marker = '''
// ADMIN DASHBOARD STATS
'''

new_routes = '''
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

'''

if marker not in content:

    print("Marker not found.")
    exit()

content = content.replace(
    marker,
    new_routes + marker,
    1
)

server.write_text(content)

print(
    "Registration lifecycle routes added successfully."
)
