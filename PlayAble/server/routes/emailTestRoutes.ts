// emailTestRoutes.ts
// Temporary route for verifying email delivery during development.
// Not intended for production use. Remove or secure before deployment.
import { Router } from "express";
import { sendEmail } from "../services/emailService";

const router = Router();

router.get("/test-email", async (req, res) => {
  try {
    // Sends a test email to confirm SMTP configuration. Update recipient as needed for local testing.
    await sendEmail(
      "student@example.com",
      "Test Email",
      "This is working!"
    );
    res.send("Email sent!");
  } catch (err) {
    // Logs errors for troubleshooting email delivery issues.
    console.error(err);
    res.status(500).send("Email failed");
  }
});

export default router;
