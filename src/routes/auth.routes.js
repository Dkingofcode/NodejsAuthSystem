const express = require("express");
const {
  register,
  login,
  verify2FA,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  setup2FA,
  enable2FA,
  disable2FA,
  getCurrentUser,
  resendVerificationEmail,
} = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth");
const {
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validate2FACode,
} = require("../middleware/validation");

const router = express.Router();

// Public routes
router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);
router.post("/verify-2fa", validate2FACode, verify2FA);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/resend-verification", resendVerificationEmail);
router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reset Password</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 500px; 
          margin: 50px auto; 
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        .form-group { margin-bottom: 20px; }
        label { 
          display: block; 
          margin-bottom: 5px; 
          font-weight: bold;
          color: #555;
        }
        input { 
          width: 100%; 
          padding: 12px; 
          border: 2px solid #ddd; 
          border-radius: 4px; 
          box-sizing: border-box;
          font-size: 14px;
        }
        input:focus {
          outline: none;
          border-color: #4CAF50;
        }
        button { 
          background: #4CAF50; 
          color: white; 
          padding: 14px 20px; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          width: 100%; 
          font-size: 16px;
          font-weight: bold;
        }
        button:hover { background: #45a049; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .info { 
          background: #fff3cd; 
          padding: 15px; 
          border-left: 4px solid #ffc107; 
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .info strong { display: block; margin-bottom: 5px; }
        .error { 
          background: #f8d7da; 
          color: #721c24; 
          padding: 15px; 
          border-left: 4px solid #f5c6cb; 
          margin-bottom: 20px;
          border-radius: 4px;
          display: none; 
        }
        .success { 
          background: #d4edda; 
          color: #155724; 
          padding: 15px; 
          border-left: 4px solid #c3e6cb; 
          margin-bottom: 20px;
          border-radius: 4px;
          display: none; 
        }
        .loading {
          display: none;
          text-align: center;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Reset Your Password</h1>
        
        <div class="info">
          <strong>Password Requirements:</strong>
          • At least 8 characters<br>
          • 1 uppercase letter (A-Z)<br>
          • 1 lowercase letter (a-z)<br>
          • 1 number (0-9)<br>
          • 1 special character (@$!%*?&)
        </div>
        
        <div id="error" class="error"></div>
        <div id="success" class="success"></div>
        
        <form id="resetForm">
          <div class="form-group">
            <label>New Password:</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              minlength="8"
              placeholder="Enter your new password"
            />
          </div>
          
          <div class="form-group">
            <label>Confirm Password:</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              required 
              minlength="8"
              placeholder="Confirm your new password"
            />
          </div>
          
          <button type="submit" id="submitBtn">Reset Password</button>
          <div class="loading" id="loading">Resetting password...</div>
        </form>
      </div>

      <script>
        document.getElementById('resetForm').addEventListener('submit', async (e) => {
          e.preventDefault(); // Prevent default form submission
          
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          const errorDiv = document.getElementById('error');
          const successDiv = document.getElementById('success');
          const submitBtn = document.getElementById('submitBtn');
          const loadingDiv = document.getElementById('loading');
          
          // Hide previous messages
          errorDiv.style.display = 'none';
          successDiv.style.display = 'none';
          
          // Validate passwords match
          if (password !== confirmPassword) {
            errorDiv.textContent = '❌ Passwords do not match!';
            errorDiv.style.display = 'block';
            return;
          }
          
          // Validate password requirements
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/;
          if (!passwordRegex.test(password)) {
            errorDiv.textContent = '❌ Password does not meet requirements. Please check the requirements above.';
            errorDiv.style.display = 'block';
            return;
          }
          
          // Disable button and show loading
          submitBtn.disabled = true;
          loadingDiv.style.display = 'block';
          
          try {
            const response = await fetch('/api/auth/reset-password/${token}', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ password: password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              successDiv.innerHTML = '✅ ' + data.message + '<br><br>Redirecting in 3 seconds...';
              successDiv.style.display = 'block';
              document.getElementById('resetForm').style.display = 'none';
              
              setTimeout(() => {
                window.location.href = '/api';
              }, 3000);
            } else {
              errorDiv.textContent = '❌ ' + (data.message || 'Password reset failed. Please try again.');
              errorDiv.style.display = 'block';
              submitBtn.disabled = false;
              loadingDiv.style.display = 'none';
            }
          } catch (error) {
            console.error('Error:', error);
            errorDiv.textContent = '❌ An error occurred. Please try again or request a new reset link.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            loadingDiv.style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `);
});
router.post("/reset-password/:token", validatePasswordReset, resetPassword);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.use(authenticateToken);

router.get("/me", getCurrentUser);
router.post("/logout", logout);

// 2FA routes
router.post("/2fa/setup", setup2FA);
router.post("/2fa/enable", validate2FACode, enable2FA);
router.post("/2fa/disable", validate2FACode, disable2FA);

module.exports = router;